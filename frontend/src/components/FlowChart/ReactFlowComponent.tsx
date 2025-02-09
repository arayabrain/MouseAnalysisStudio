import React, { DragEvent, MouseEvent, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Controls,
  Elements,
  Connection,
  Edge,
  Node,
  OnLoadParams,
  FlowTransform,
} from 'react-flow-renderer'
import { useDrop } from 'react-dnd'

import 'style/flow.css'
import {
  deleteFlowElements,
  editFlowElementPositionById,
  setFlowElements,
  setFlowPosition,
} from 'store/slice/FlowElement/FlowElementSlice'
import {
  selectFlowElements,
  selectFlowPosition,
} from 'store/slice/FlowElement/FlowElementSelectors'
import { UseRunPipelineReturnType } from 'store/slice/Pipeline/PipelineHook'
import { ToolBar } from 'components/ToolBar'
import {
  reactFlowEdgeTypes,
  reactFlowNodeTypes,
} from './FlowChartNode/ReactFlowNodeTypesConst'
import {
  DND_ITEM_TYPE_SET,
  TreeItemCollectedProps,
  TreeItemDragObject,
  TreeItemDropResult,
} from './DnDItemType'
import { AlgorithmOutputDialog } from './FlowChartNode/AlgorithmOutputDialog'
import {
  DialogContext,
  ErrorDialogValue,
  OpenDialogValue,
} from 'components/FlowChart/DialogContext'
import { FileSelectDialog } from 'components/common/FileSelectDialog'
import { FormHelperText, Popover } from '@mui/material'
import ImageAlignment from '../ImageAlignment'
import { Params } from 'store/slice/InputNode/InputNodeType'
import { selectListImageUrl } from 'store/slice/Dataset/DatasetSelector'
import { selectLoadingExperiment } from 'store/slice/Experiments/ExperimentsSelectors'
import Loading from 'components/common/Loading'

const initDialogFile = {
  filePath: '',
  open: false,
  fileTreeType: undefined,
  multiSelect: false,
  onSelectFile: () => null,
}

export const ReactFlowComponent = React.memo<UseRunPipelineReturnType>(
  (props) => {
    const flowElements = useSelector(selectFlowElements)
    const dispatch = useDispatch()
    const urls = useSelector(selectListImageUrl)

    const loadingExpriment = useSelector(selectLoadingExperiment)

    const [openPopupAlignment, setOpenPopupAlignment] = useState<{
      open: boolean
      params?: { nodeId: string; alignments: Params[] }
    }>({
      open: false,
      params: { nodeId: '', alignments: [] },
    })
    const [dialogNodeId, setDialogNodeId] = useState('')
    const [dialogFile, setDialogFile] =
      useState<OpenDialogValue>(initDialogFile)
    const [messageError, setMessageError] = useState<ErrorDialogValue>({
      anchorElRef: { current: null },
      message: '',
    })

    const onConnect = (params: Connection | Edge) => {
      dispatch(
        setFlowElements(
          addEdge(
            {
              ...params,
              animated: false,
              style: { width: 5 },
              type: 'buttonedge',
            },
            flowElements,
          ),
        ),
      )
    }

    const onElementsRemove = (elementsToRemove: Elements) => {
      dispatch(deleteFlowElements(elementsToRemove))
    }

    const onDragOver = (event: DragEvent) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    }

    const onNodeDragStop = (event: MouseEvent, node: Node) => {
      dispatch(
        editFlowElementPositionById({
          nodeId: node.id,
          coord: { x: node.position.x, y: node.position.y },
        }),
      )
    }

    const flowPosition = useSelector(selectFlowPosition)

    const onMoveEnd = (event: FlowTransform | undefined) => {
      if (event !== undefined) {
        dispatch(setFlowPosition(event))
      }
    }

    const [reactFlowInstance, setReactFlowInstance] =
      React.useState<OnLoadParams>()

    const onLoad = (reactFlowInstance: OnLoadParams) =>
      setReactFlowInstance(reactFlowInstance)
    const wrapparRef = React.useRef<HTMLDivElement>(null)
    const [, drop] = useDrop<
      TreeItemDragObject,
      TreeItemDropResult,
      TreeItemCollectedProps
    >(
      () => ({
        accept: DND_ITEM_TYPE_SET.TREE_ITEM,
        drop: (_, monitor) => {
          let position: TreeItemDropResult['position'] = undefined
          const monitorOffset = monitor.getClientOffset()
          if (
            wrapparRef.current != null &&
            monitorOffset != null &&
            reactFlowInstance != null
          ) {
            position = reactFlowInstance.project({
              x: monitorOffset.x - wrapparRef.current.offsetLeft - 40,
              y: monitorOffset.y - wrapparRef.current.offsetTop - 40,
            })
          }
          return { position }
        },
      }),
      [reactFlowInstance],
    )

    return (
      <div className="flow">
        <DialogContext.Provider
          value={{
            images: urls,
            onOpen: setDialogNodeId,
            onOpenDialogFile: setDialogFile,
            onMessageError: setMessageError,
            onOpenImageAlignment: (flag, params) => {
              setOpenPopupAlignment({ open: flag, params })
            },
          }}
        >
          <ReactFlowProvider>
            <div className="reactflow-wrapper" ref={wrapparRef}>
              <ReactFlow
                ref={drop}
                elements={flowElements}
                onElementsRemove={onElementsRemove}
                onConnect={onConnect}
                onLoad={onLoad}
                onDragOver={onDragOver}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={reactFlowNodeTypes}
                edgeTypes={reactFlowEdgeTypes}
                defaultPosition={[flowPosition.x, flowPosition.y]}
                defaultZoom={flowPosition.zoom}
                onMoveEnd={onMoveEnd}
              >
                <ToolBar {...props} />
                <Controls />
              </ReactFlow>
            </div>
          </ReactFlowProvider>
          {openPopupAlignment.open && (
            <ImageAlignment
              open={openPopupAlignment.open}
              onClose={() => setOpenPopupAlignment({ open: false })}
              urls={urls}
              params={openPopupAlignment.params}
            />
          )}
          {dialogNodeId && (
            <AlgorithmOutputDialog
              nodeId={dialogNodeId}
              open
              onClose={() => setDialogNodeId('')}
            />
          )}
          {dialogFile.open && (
            <FileSelectDialog
              multiSelect={dialogFile.multiSelect}
              initialFilePath={dialogFile.filePath}
              open={dialogFile.open}
              onClickOk={(path) => {
                dialogFile.onSelectFile(path)
                setDialogFile(initDialogFile)
              }}
              onClickCancel={() => {
                setDialogFile(initDialogFile)
              }}
              fileType={dialogFile.fileTreeType}
            />
          )}
          {messageError?.message && (
            <Popover
              open
              anchorEl={messageError.anchorElRef.current}
              onClose={() =>
                setMessageError({ anchorElRef: { current: null }, message: '' })
              }
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              <div style={{ margin: 8 }}>
                <FormHelperText error={true}>
                  {messageError.message}
                </FormHelperText>
              </div>
            </Popover>
          )}
          {loadingExpriment && <Loading />}
        </DialogContext.Provider>
      </div>
    )
  },
)
