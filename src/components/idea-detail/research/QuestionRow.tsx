import type { Question } from '../../../types/idea'

interface QuestionRowProps {
  question: Question
  readOnly?: boolean
  onToggleAnswered?: (questionId: string, answered: boolean) => void
  onAnswerChange?: (questionId: string, answer: string) => void
  onRemove?: (questionId: string) => void
}

export function QuestionRow({ question, readOnly, onToggleAnswered, onAnswerChange, onRemove }: QuestionRowProps) {
  const done = question.status === 'answered'
  return (
    <li className={`rs-row${done ? ' done' : ''}`}>
      <span className="rs-ico" aria-hidden="true">
        {readOnly ? (
          done ? '✓' : '?'
        ) : (
          <input
            type="checkbox"
            className="rs-chk"
            checked={done}
            aria-label="Mark answered"
            onChange={(e) => onToggleAnswered?.(question.id, e.target.checked)}
          />
        )}
      </span>
      <div className="rs-main">
        <div className="rs-t">{question.text}</div>
        {readOnly ? (
          question.answer && <p className="rs-n">{question.answer}</p>
        ) : (
          <input
            type="text"
            className="rs-note"
            value={question.answer}
            placeholder="Answer or what you found…"
            aria-label="Answer"
            onChange={(e) => onAnswerChange?.(question.id, e.target.value)}
          />
        )}
      </div>
      {!readOnly && (
        <button className="rs-x" aria-label="Remove question" title="Remove" onClick={() => onRemove?.(question.id)}>
          ✕
        </button>
      )}
    </li>
  )
}
