import axios from 'axios'

import { BASE_URL } from 'const/API'
import { EdgeDict, NodeDict, OutputPathsDTO, RunPostData } from 'api/run/Run'
import { EXPERIMENTS_STATUS } from 'store/slice/Experiments/ExperimentsType'

export type ExperimentsDTO = {
  [uid: string]: ExperimentDTO
}

export type FunctionsDTO = {
  [nodeId: string]: {
    name: string
    success: string
    unique_id: string
    hasNWB: boolean
    message?: string
    started_at?: string
    finished_at?: string
    outputPaths?: OutputPathsDTO
  }
}

export type ExperimentDTO = {
  function: FunctionsDTO
  name: string
  success?: EXPERIMENTS_STATUS
  started_at: string
  finished_at?: string
  project_id: string
  unique_id: string
  hasNWB: boolean
  edgeDict: EdgeDict
  nodeDict: NodeDict
}

export async function getExperimentsApi(
  projectId: string,
): Promise<ExperimentsDTO> {
  const response = await axios.get(`${BASE_URL}/experiments/${projectId}`)
  return response.data
}

export async function deleteExperimentByUidApi(uid: string): Promise<boolean> {
  const response = await axios.delete(`${BASE_URL}/experiments/${uid}`)
  return response.data
}

export async function deleteExperimentByListApi(
  uidList: Array<string>,
): Promise<boolean> {
  const response = await axios.post(`${BASE_URL}/experiments/delete`, {
    uidList,
  })
  return response.data
}

export async function importExperimentByUidApi(
  uid: string,
): Promise<RunPostData> {
  const response = await axios.get(`${BASE_URL}/experiments/import/${uid}`)
  return response.data
}

export async function fetchExperimentApi(
  projectId: string,
): Promise<ExperimentDTO> {
  const response = await axios.get(`${BASE_URL}/experiments/fetch/${projectId}`)
  return response.data
}

export async function downloadExperimentNwbApi(uid: string, nodeId?: string) {
  const path =
    nodeId != null
      ? `${BASE_URL}/experiments/download/nwb/${uid}/${nodeId}`
      : `${BASE_URL}/experiments/download/nwb/${uid}`
  const response = await axios.get(path, {
    responseType: 'blob',
  })
  return response.data
}

export async function downloadExperimentConfigApi(uid: string) {
  const response = await axios.get(
    `${BASE_URL}/experiments/download/config/${uid}`,
    {
      responseType: 'blob',
    },
  )
  return response.data
}

export const getResultProject = async (id: string) => {
  const response = await axios.get(`${BASE_URL}/run_result/${id}`)
  return response.data
}
