import React from 'react';
import { List, Typography, Button, message, Popover, Collapse, Col } from 'antd';
import { DeleteOutlined, SubnodeOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { prevent, getByKey } from '../../utils/utils';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../models/AppState';
import { selectFlow, deleteFlow, reorderFlow, cloneFlow } from './CollectionActions';
import { DragDropContext, DropResult, Draggable, Droppable } from 'react-beautiful-dnd';
import { Separator } from './CollectionCell';

const ClickableItem = styled(List.Item)`
  display: flex;
  justify-content: space-between;
  &:hover {
    cursor: pointer;
    background-color: #f7fcff;
  }
  padding: 0;
`;

type Props = {
  collectionName: string;
};

const FlowList: React.FunctionComponent<Props> = ({ collectionName }) => {
  const dispatch = useDispatch();

  const collection = useSelector((s: AppState) => getByKey(s.collections, collectionName));
  const allFlowNames = useSelector((s: AppState) => collection?.flows?.map(([n]) => n));
  type flowItemMetadata = { index: Number; displayName: string; flowName: string };
  const flowGroups = (allFlowNames || []).reduce(
    (acc: { root: flowItemMetadata[]; groups: { [key: string]: flowItemMetadata[] } }, flowName, index) => {
      const pathSepIndex = flowName.indexOf('/');
      if (pathSepIndex === -1) {
        acc['root'].push({ index, displayName: flowName, flowName });
        return acc;
      }
      const groupName = flowName.substring(0, pathSepIndex);
      const displayName = flowName.substring(pathSepIndex + 1);
      acc['groups'][groupName] = acc['groups'][groupName] || [];
      acc['groups'][groupName].push({ index, displayName, flowName });
      return acc;
    },
    { root: [], groups: {} },
  );
  const isCurrentCollection = useSelector((s: AppState) => s.currentCollection === collectionName);
  const currentFlow = useSelector((s: AppState) => s.currentFlow);

  function handleSelection(flowName: string): void {
    dispatch(selectFlow(collectionName, flowName));
  }

  function validateFlowName(flowName: string): boolean {
    return !collection?.flows?.map(([n]) => n)?.includes(flowName);
  }

  function handleDelete(flowName: string): void {
    const flowCount = collection?.flows?.length || 0;
    if (flowCount > 1) {
      dispatch(deleteFlow(collectionName, flowName));
    } else {
      message.error("Can't delete the last request");
    }
  }

  function handleClone(originalFlowName: string): void {
    //check if this clone already exists
    const tmpName = originalFlowName.concat('_clone');
    let tmpNameIdx = 1;
    while (!validateFlowName(`${tmpName}${tmpNameIdx}`)) tmpNameIdx++;
    dispatch(cloneFlow(collectionName, originalFlowName, `${tmpName}${tmpNameIdx}`));
  }

  function handleDragEnd(result: DropResult): void {
    console.log(result);
    if (!result.destination || result.source.droppableId != result.destination.droppableId) return;

    const src = result.source.index;
    const dst = result.destination.index;

    dispatch(reorderFlow(collectionName, src, dst));
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={collectionName}>
        {(provided): React.ReactElement => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            <Collapse>
              <Collapse.Panel header="Not Categorized" key="root" showArrow={false}>
                <List
                  dataSource={flowGroups.root}
                  rowKey={item => item.flowName}
                  renderItem={(item, idx): React.ReactNode => (
                    <FlowCell
                      idx={idx}
                      displayName={item.displayName}
                      flowName={item.flowName}
                      emphasize={isCurrentCollection && currentFlow === item.flowName}
                      handleSelection={handleSelection}
                      handleDelete={handleDelete}
                      handleClone={handleClone}
                    />
                  )}
                />
              </Collapse.Panel>

              {Object.keys(flowGroups.groups).map(groupName => (
                <Collapse.Panel key={groupName} header={groupName} showArrow={false}>
                  <List
                    dataSource={flowGroups.groups[groupName]}
                    rowKey={item => item.flowName}
                    renderItem={(item, idx): React.ReactNode => (
                      <FlowCell
                        idx={idx}
                        displayName={item.displayName}
                        flowName={item.flowName}
                        emphasize={isCurrentCollection && currentFlow === item.flowName}
                        handleSelection={handleSelection}
                        handleDelete={handleDelete}
                        handleClone={handleClone}
                      />
                    )}
                  />
                </Collapse.Panel>
              ))}
            </Collapse>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

type CellProps = {
  displayName: string;
  flowName: string;
  emphasize: boolean;
  idx: number;
  handleSelection: (name: string) => void;
  handleDelete: (name: string) => void;
  handleClone: (name: string) => void;
};

const FlowCell: React.FC<CellProps> = ({
  displayName,
  flowName,
  emphasize,
  handleSelection,
  handleDelete,
  handleClone,
  idx,
}) => {
  const [menuVisible, setMenuVisible] = React.useState(false);
  function showMenu(): void {
    setMenuVisible(true);
  }

  function hideMenu(): void {
    setMenuVisible(false);
  }

  function deleteFlow(): void {
    handleDelete(flowName);
    hideMenu();
  }

  function cloneFlow(): void {
    handleClone(flowName);
    hideMenu();
  }

  const menu = (
    <>
      <Button type="link" danger onClick={prevent(deleteFlow)}>
        <DeleteOutlined />
        Delete Request
      </Button>
      <Separator />
      <Button type="link" onClick={prevent(cloneFlow)}>
        <SubnodeOutlined />
        Clone Request
      </Button>
    </>
  );

  return (
    <Popover
      placement="rightTop"
      content={menu}
      visible={menuVisible}
      trigger="contextMenu"
      onVisibleChange={setMenuVisible}
    >
      <ClickableItem onClick={(): void => handleSelection(flowName)} onContextMenu={prevent(showMenu)}>
        <Draggable draggableId={flowName} index={idx}>
          {(provided): React.ReactElement => {
            const style: React.CSSProperties = {
              width: '100%',
              height: '100%',
              padding: 8,
              boxSizing: 'border-box',
            };

            const { style: draggableStyle, ...draggableRest } = provided.draggableProps;

            return (
              <div
                ref={provided.innerRef}
                {...provided.dragHandleProps}
                {...draggableRest}
                style={{ ...style, ...draggableStyle }}
              >
                <Typography.Text
                  strong={emphasize}
                  style={{ userSelect: 'none', color: emphasize ? 'rgb(47, 93, 232)' : undefined }}
                >
                  {displayName}
                </Typography.Text>
              </div>
            );
          }}
        </Draggable>
      </ClickableItem>
    </Popover>
  );
};

export default FlowList;
