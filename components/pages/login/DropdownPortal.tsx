import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DropdownPortalProps {
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  open: boolean;
  minWidth?: number;
  maxWidth?: number;
  maxHeight?: number;
  onClose?: () => void;
  align?: 'left' | 'right';
  preferAbove?: boolean;
  className?: string;
}

export function DropdownPortal({
  anchorRef,
  children,
  open,
  minWidth = 200,
  maxWidth = 400,
  maxHeight = 320,
  onClose,
  align = 'left',
  preferAbove = false,
  className = '',
}: DropdownPortalProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const portalRef = useRef<HTMLDivElement>(null);

  // ✅ FIX: Recalculate position on scroll/resize (not just copy style)
  useEffect(() => {
    if (!open || !anchorRef.current) return;

    const recalculatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Calculate available space
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      let dropdownHeight = Math.min(maxHeight, 320);

      // ✅ FIX: ALWAYS prefer showing below unless there's absolutely no space
      // This ensures dropdowns appear below the button as expected
      let top = rect.bottom + scrollY + 4;

      // Only show above if there's NO space below AND there's space above
      if (spaceBelow < 100 && spaceAbove > dropdownHeight) {
        dropdownHeight = Math.min(dropdownHeight, spaceAbove - 8);
        top = rect.top + scrollY - dropdownHeight - 4;
      } else {
        dropdownHeight = Math.min(dropdownHeight, Math.max(spaceBelow - 8, 200));
      }

      let left = rect.left + scrollX;
      let width = Math.max(rect.width, minWidth);
      width = Math.min(width, maxWidth, viewportWidth - 16);

      // Align right if needed
      if (align === 'right') {
        left = rect.right + scrollX - width;
      }
      // Prevent overflow right
      if (left + width > viewportWidth) {
        left = viewportWidth - width - 8;
      }
      // Prevent overflow left
      if (left < 8) {
        left = 8;
      }

      setStyle({
        position: 'absolute',
        top,
        left,
        width,
        minWidth,
        maxWidth,
        maxHeight: dropdownHeight,
        zIndex: 9999,
        overflowY: 'auto',
      });
    };

    // Initial calculation
    recalculatePosition();

    // Recalculate on scroll/resize
    window.addEventListener('scroll', recalculatePosition, true);
    window.addEventListener('resize', recalculatePosition);
    return () => {
      window.removeEventListener('scroll', recalculatePosition, true);
      window.removeEventListener('resize', recalculatePosition);
    };
  }, [open, anchorRef, minWidth, maxWidth, maxHeight, align, preferAbove]);

  // Close on click outside
  useEffect(() => {
    if (!open || !onClose) return;
    const handleClick = (e: Event) => {
      if (
        portalRef.current &&
        !portalRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    // ✅ FIX: Use capture phase to allow dropdown items to handle clicks first
    document.addEventListener('mousedown', handleClick, false);
    document.addEventListener('touchstart', handleClick, false);
    return () => {
      document.removeEventListener('mousedown', handleClick, false);
      document.removeEventListener('touchstart', handleClick, false);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return createPortal(
    <div
      ref={portalRef}
      style={{ ...style, pointerEvents: 'auto' }}
      className={className}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}
