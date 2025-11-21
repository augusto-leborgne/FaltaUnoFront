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

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const anchor = anchorRef.current;
    const rect = anchor.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Calculate available space
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    let dropdownHeight = Math.min(maxHeight, 320);
    let top = rect.bottom + scrollY + 4;
    let left = rect.left + scrollX;
    let width = Math.max(rect.width, minWidth);
    width = Math.min(width, maxWidth, viewportWidth - 16);

    // Prefer above if not enough space below or preferAbove is set
    if ((preferAbove && spaceAbove > dropdownHeight) || (spaceBelow < dropdownHeight && spaceAbove > spaceBelow)) {
      dropdownHeight = Math.min(dropdownHeight, spaceAbove - 8);
      top = rect.top + scrollY - dropdownHeight - 4;
    } else {
      dropdownHeight = Math.min(dropdownHeight, spaceBelow - 8);
    }

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
  }, [open, anchorRef, minWidth, maxWidth, maxHeight, align, preferAbove]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const handler = () => setStyle((s) => ({ ...s }));
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open]);

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
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return createPortal(
    <div ref={portalRef} style={style} className={className}>
      {children}
    </div>,
    document.body
  );
}
