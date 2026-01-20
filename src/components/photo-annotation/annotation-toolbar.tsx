'use client'

import { cn } from '@/lib/utils'
import {
  type ToolMode,
  type AnnotationColor,
  ANNOTATION_COLORS,
  STROKE_WIDTHS,
} from '@/lib/annotation/fabric-helpers'

interface AnnotationToolbarProps {
  toolMode: ToolMode
  strokeColor: AnnotationColor
  strokeWidth: number
  canUndo: boolean
  canRedo: boolean
  onToolModeChange: (mode: ToolMode) => void
  onStrokeColorChange: (color: AnnotationColor) => void
  onStrokeWidthChange: (width: number) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onDelete: () => void
}

export function AnnotationToolbar({
  toolMode,
  strokeColor,
  strokeWidth,
  canUndo,
  canRedo,
  onToolModeChange,
  onStrokeColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClear,
  onDelete,
}: AnnotationToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
      {/* Tool Mode Buttons */}
      <div className="flex items-center gap-1 border-r border-gray-600 pr-3">
        <ToolButton
          active={toolMode === 'select'}
          onClick={() => onToolModeChange('select')}
          title="Select (V)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
        </ToolButton>

        <ToolButton
          active={toolMode === 'arrow'}
          onClick={() => onToolModeChange('arrow')}
          title="Arrow (A)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </ToolButton>

        <ToolButton
          active={toolMode === 'freehand'}
          onClick={() => onToolModeChange('freehand')}
          title="Freehand (F)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </ToolButton>
      </div>

      {/* Color Picker */}
      <div className="flex items-center gap-1 border-r border-gray-600 pr-3">
        {ANNOTATION_COLORS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onStrokeColorChange(value)}
            title={label}
            className={cn(
              'w-6 h-6 rounded-full border-2 cursor-pointer transition-transform',
              strokeColor === value ? 'border-white scale-110' : 'border-transparent',
              value === '#ffffff' && 'ring-1 ring-gray-600'
            )}
            style={{ backgroundColor: value }}
          />
        ))}
      </div>

      {/* Stroke Width */}
      <div className="flex items-center gap-1 border-r border-gray-600 pr-3">
        {STROKE_WIDTHS.map((width) => (
          <button
            key={width}
            onClick={() => onStrokeWidthChange(width)}
            title={`${width}px`}
            className={cn(
              'w-8 h-8 rounded flex items-center justify-center cursor-pointer',
              strokeWidth === width ? 'bg-gray-600' : 'hover:bg-gray-700'
            )}
          >
            <div
              className="rounded-full bg-white"
              style={{ width: width + 2, height: width + 2 }}
            />
          </button>
        ))}
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r border-gray-600 pr-3">
        <ToolButton onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        </ToolButton>

        <ToolButton onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
            />
          </svg>
        </ToolButton>
      </div>

      {/* Delete and Clear */}
      <div className="flex items-center gap-1">
        <ToolButton onClick={onDelete} title="Delete Selected (Delete)">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </ToolButton>

        <ToolButton onClick={onClear} title="Clear All">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </ToolButton>
      </div>
    </div>
  )
}

interface ToolButtonProps {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
}

function ToolButton({ children, onClick, active, disabled, title }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-9 h-9 rounded flex items-center justify-center text-white cursor-pointer transition-colors',
        active && 'bg-blue-600',
        !active && !disabled && 'hover:bg-gray-700',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}
