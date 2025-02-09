from dataclasses import dataclass
from typing import Dict, Optional

from optinist.api.workflow.workflow import Edge, Node, OutputPath, SubjectAnalysisInfo


@dataclass
class ExptFunction:
    unique_id: str
    name: str
    success: str
    hasNWB: bool
    message: Optional[str] = None
    outputPaths: Optional[Dict[str, OutputPath]] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    subjects: Optional[Dict[str, SubjectAnalysisInfo]] = None  # CJS-3: Added.


@dataclass
class ExptConfig:
    started_at: str
    finished_at: Optional[str]
    success: Optional[str]
    name: str
    project_id: str
    unique_id: str
    hasNWB: bool
    function: Dict[str, ExptFunction]
    nodeDict: Dict[str, Node]
    edgeDict: Dict[str, Edge]

@dataclass
class ExptImportData:
    nodeDict: Dict[str, Node]
    edgeDict: Dict[str, Edge]