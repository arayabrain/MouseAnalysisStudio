import os
import traceback
import gc
import copy
from dataclasses import asdict
from datetime import datetime

from optinist.api.config.config_writer import ConfigWriter
from optinist.api.dir_path import DIRPATH
from optinist.api.experiment.experiment_reader import ExptConfigReader
from optinist.wrappers import wrapper_dict
from optinist.api.snakemake.smk import Rule
from optinist.api.pickle.pickle_reader import PickleReader
from optinist.api.pickle.pickle_writer import PickleWriter
from optinist.api.utils.filepath_creater import join_filepath
from optinist.api.nwb.nwb_creater import merge_nwbfile, save_nwb
from optinist.api.dataclass.dataclass import AnalysisInfo
from optinist.api.experiment.experiment import ExptFunction


class Runner:
    @classmethod
    def run(cls, __rule: Rule, last_output):
        try:
            input_info = cls.read_input_info(__rule.input)

            cls.change_dict_key_exist(input_info, __rule)

            nwbfile = input_info['nwbfile']

            # input_info
            for key in list(input_info):
                if key not in __rule.return_arg.values():
                    input_info.pop(key)

            cls.set_func_start_timestamp(os.path.dirname(__rule.output))

            # output_info
            output_info = cls.execute_function(
                __rule.path,
                __rule.params,
                input_info
            )

            if 'analysis_info_out' in output_info.keys():
                # The function was added just after the node analysis, which updates experiment.yaml
                # with the node analysis info such as output file paths and status.
                cls.set_node_analysis_info(os.path.dirname(__rule.output), output_info['analysis_info_out'])

            # nwbfileの設定
            output_info['nwbfile'] = cls.save_func_nwb(
                f"{__rule.output.split('.')[0]}.nwb",
                __rule.type,
                nwbfile,
                output_info,
            )

            # 各関数での結果を保存
            PickleWriter.write(__rule.output, output_info)

            # NWB全体保存
            if __rule.output in last_output:
                # 全体の結果を保存する
                path = join_filepath(os.path.dirname(os.path.dirname(__rule.output)))
                path = join_filepath([path, f"whole_{__rule.type}.nwb"])
                cls.save_all_nwb(path, output_info['nwbfile'])

            print("output: ", __rule.output)

            del input_info, output_info
            gc.collect()

        except Exception as e:
            PickleWriter.write(
                __rule.output,
                list(traceback.TracebackException.from_exception(e).format())[-2:],
            )

    @classmethod
    def set_node_analysis_info(cls, output_dirpath: str, analysis_info: AnalysisInfo):
        """
        Update the experiment.yaml with the node analysis info such as output file paths and status.
        """

        # Get the ExptConfig data from the experiment.yaml.
        workflow_dirpath = os.path.dirname(output_dirpath)
        node_id = os.path.basename(output_dirpath)
        expt_file_path = join_filepath([workflow_dirpath, DIRPATH.EXPERIMENT_YML])
        expt_config = ExptConfigReader.read(expt_file_path)

        # Extract the info about the output files and subjects from the AnalysisInfo object of the node output.
        output_path_dict = {}
        subject_dict = {}
        for wf_input_path in analysis_info.workflow_input_file_path_list:
            # For "outputPaths".
            output_file_paths = analysis_info.get_output_file_paths(wf_input_path)
            for output_file_path in output_file_paths:
                file_name = os.path.splitext(os.path.basename(output_file_path))[0]
                output_path_dict[file_name] = {
                    'path': output_file_path,
                    'type': 'images',
                    'max_index': None
                }

            # For "subjects".
            # All the data are held in a form of List to support multiple workflow input files for a single subject.
            subject = analysis_info.get_subject(wf_input_path)
            if subject in subject_dict.keys():
                subject_dict[subject]['success'].append(analysis_info.get_unit_analysis_status(wf_input_path))
                subject_dict[subject]['output_path'].append(output_file_paths)
                subject_dict[subject]['message'].append(analysis_info.get_message(wf_input_path))
            else:
                subject_dict[subject] = {
                    'success': [analysis_info.get_unit_analysis_status(wf_input_path)],
                    'output_path': [output_file_paths],
                    'message': [analysis_info.get_message(wf_input_path)]
                }

        # Create an ExptFunction object for the node, and update the ExptConfig data.
        expt_function = expt_config.function
        expt_config.function[node_id] = ExptFunction(
            unique_id=expt_function[node_id].unique_id,
            name=expt_function[node_id].name,
            success=analysis_info.get_node_analysis_status(),
            hasNWB=expt_function[node_id].hasNWB,
            message=analysis_info.get_node_analysis_status(),
            outputPaths=output_path_dict,
            started_at=analysis_info.analysis_start_time,
            finished_at=analysis_info.analysis_end_time,
            subjects=subject_dict
        )

        # Overwrite the experiment.yaml with updated ExptConfig data.
        ConfigWriter.write(
            dirname=workflow_dirpath,
            filename=DIRPATH.EXPERIMENT_YML,
            config=asdict(expt_config)
        )

    @classmethod
    def set_func_start_timestamp(cls, output_dirpath):
        workflow_dirpath = os.path.dirname(output_dirpath)
        node_id = os.path.basename(output_dirpath)
        expt_config = ExptConfigReader.read(
            join_filepath([workflow_dirpath, DIRPATH.EXPERIMENT_YML])
        )
        expt_config.function[node_id].started_at = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )
        ConfigWriter.write(
            dirname=workflow_dirpath,
            filename=DIRPATH.EXPERIMENT_YML,
            config=asdict(expt_config),
        )

    @classmethod
    def save_func_nwb(cls, save_path, name, nwbfile, output_info):
        if "nwbfile" in output_info:
            nwbfile[name] = output_info["nwbfile"]
            save_nwb(
                save_path,
                nwbfile["input"],
                output_info["nwbfile"],
            )
        return nwbfile

    @classmethod
    def save_all_nwb(cls, save_path, all_nwbfile):
        input_nwbfile = all_nwbfile["input"]
        all_nwbfile.pop("input")
        nwbfile = {}
        for x in all_nwbfile.values():
            nwbfile = merge_nwbfile(nwbfile, x)
        save_nwb(save_path, input_nwbfile, nwbfile)

    @classmethod
    def execute_function(cls, path, params, input_info):
        wrapper = cls.dict2leaf(wrapper_dict, path.split('/'))
        func = copy.deepcopy(wrapper["function"])
        output_info = func(params=params, **input_info)
        del func
        gc.collect()

        return output_info

    @classmethod
    def change_dict_key_exist(cls, input_info, rule_config: Rule):
        for return_name, arg_name in rule_config.return_arg.items():
            if return_name in input_info:
                input_info[arg_name] = input_info.pop(return_name)

    @classmethod
    def read_input_info(cls, input_files):
        input_info = {}
        for filepath in input_files:
            load_data = PickleReader.read(filepath)
            input_info = dict(list(load_data.items()) + list(input_info.items()))
        return input_info

    @classmethod
    def dict2leaf(cls, root_dict: dict, path_list):
        path = path_list.pop(0)
        if len(path_list) > 0:
            return cls.dict2leaf(root_dict[path], path_list)
        else:
            return root_dict[path]
