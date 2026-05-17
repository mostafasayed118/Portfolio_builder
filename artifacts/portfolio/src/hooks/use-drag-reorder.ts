import { useState, useCallback, useRef } from "react";

export interface DragHandleProps {
  draggable: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  "data-drag-id": string;
}

export function useDragReorder<T extends { id: string }>(
  items: T[],
  onReorder: (newOrder: T[]) => Promise<void> | void,
) {
  const [orderedItems, setOrderedItems] = useState<T[]>(items);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);
  const dragNode = useRef<HTMLElement | null>(null);

  const previousItemsRef = useRef(items);
  if (items !== previousItemsRef.current) {
    previousItemsRef.current = items;
    setOrderedItems(items);
  }

  const handleDragStart = useCallback(
    (e: React.DragEvent, id: string) => {
      dragNode.current = e.currentTarget as HTMLElement;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
      setIsDragging(true);
      setDraggedId(id);
      (e.currentTarget as HTMLElement).style.opacity = "0.5";
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, id: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      if (id === draggedId) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const threshold = rect.height / 2;
      const position = y < threshold ? "before" : "after";

      setDropTargetId(id);
      setDropPosition(position);
    },
    [draggedId],
  );

  const handleDragLeave = useCallback((_e: React.DragEvent) => {
    setDropTargetId(null);
    setDropPosition(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      setIsDragging(false);
      setDropTargetId(null);
      setDropPosition(null);

      const dragIdx = orderedItems.findIndex((item) => item.id === draggedId);
      const dropIdx = orderedItems.findIndex((item) => item.id === targetId);

      if (dragIdx === -1 || dropIdx === -1 || dragIdx === dropIdx) {
        setDraggedId(null);
        if (dragNode.current) {
          dragNode.current.style.opacity = "";
          dragNode.current = null;
        }
        return;
      }

      const newItems = [...orderedItems];
      const [moved] = newItems.splice(dragIdx, 1);
      const adjustedDropIdx = dropPosition === "after" ? dropIdx : dropIdx;
      const insertAt = dragIdx < adjustedDropIdx ? adjustedDropIdx : adjustedDropIdx;
      newItems.splice(insertAt, 0, moved);

      setOrderedItems(newItems);
      setDraggedId(null);
      if (dragNode.current) {
        dragNode.current.style.opacity = "";
        dragNode.current = null;
      }

      const result = onReorder(newItems);
      if (result instanceof Promise) {
        result.catch(() => {
          setOrderedItems(orderedItems);
        });
      }
    },
    [draggedId, dropPosition, orderedItems, onReorder],
  );

  const handleDragEnd = useCallback(
    (_e: React.DragEvent) => {
      setIsDragging(false);
      setDraggedId(null);
      setDropTargetId(null);
      setDropPosition(null);
      if (dragNode.current) {
        dragNode.current.style.opacity = "";
        dragNode.current = null;
      }
    },
    [],
  );

  const getDragHandleProps = useCallback(
    (id: string): DragHandleProps => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => handleDragStart(e, id),
      onDragOver: (e: React.DragEvent) => handleDragOver(e, id),
      onDrop: (e: React.DragEvent) => handleDrop(e, id),
      onDragEnd: handleDragEnd,
      "data-drag-id": id,
    }),
    [handleDragStart, handleDragOver, handleDrop, handleDragEnd],
  );

  const moveItem = useCallback(
    (id: string, direction: "up" | "down") => {
      const idx = orderedItems.findIndex((item) => item.id === id);
      if (idx === -1) return;
      if (direction === "up" && idx === 0) return;
      if (direction === "down" && idx === orderedItems.length - 1) return;

      const newItems = [...orderedItems];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];

      setOrderedItems(newItems);

      const result = onReorder(newItems);
      if (result instanceof Promise) {
        result.catch(() => {
          setOrderedItems(orderedItems);
        });
      }
    },
    [orderedItems, onReorder],
  );

  const getItemProps = useCallback(
    (id: string) => ({
      "data-dragging": draggedId === id ? "true" : undefined,
      "data-drop-target":
        dropTargetId === id ? dropPosition : undefined,
    }),
    [draggedId, dropTargetId, dropPosition],
  );

  return {
    orderedItems,
    isDragging,
    draggedId,
    dropTargetId,
    dropPosition,
    getDragHandleProps,
    getItemProps,
    moveItem,
    handleDragLeave,
  };
}
