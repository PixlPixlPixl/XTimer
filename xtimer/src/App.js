import React, { useState, useEffect, useRef, useCallback } from "react"
import { Grid, Move, Undo2 } from "lucide-react"
import beep from './beep_alarm.mp3'

const TimerBox = ({ id, duration, position, onDelete, isNew, isGridView }) => {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)
  const audioRef = useRef(new Audio(beep)) // Placeholder for actual audio file
  const intervalRef = useRef(null)

  const handleRightClick = useCallback(
    e => {
      e.preventDefault()
      onDelete(id, timeLeft > 0)
    },
    [onDelete, id, timeLeft]
  )

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 0) {
          clearInterval(intervalRef.current)
          setIsCompleted(true)
          audioRef.current.loop = true
          audioRef.current.play()
          return 0
        }
        return prevTime - 1
      })
    }, 1000)

    return () => {
      clearInterval(intervalRef.current)
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [])

  useEffect(() => {
    if (isCompleted) {
      const flashInterval = setInterval(() => {
        setIsFlashing(prev => !prev)
      }, 500)

      return () => clearInterval(flashInterval)
    }
  }, [isCompleted])

  const formatTime = time => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = time % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  return (
    <div
      className={`timer-box ${isCompleted && isFlashing ? "completed" : ""} ${
        isNew ? "new" : ""
      } ${isGridView ? "grid-view" : ""}`}
      style={isGridView ? {} : { left: position.x, top: position.y }}
      onContextMenu={handleRightClick}
    >
      {formatTime(timeLeft)}
    </div>
  )
}

const App = () => {
  const [timers, setTimers] = useState([])
  const [deletedTimers, setDeletedTimers] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 })
  const [previewDuration, setPreviewDuration] = useState(null)
  const [isGridView, setIsGridView] = useState(false)

  const handleMouseDown = e => {
    if (e.button !== 0) return // Only respond to left mouse button
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setCurrentPosition({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = e => {
    if (!isDragging) return
    setCurrentPosition({ x: e.clientX, y: e.clientY })
    const dragDistance = Math.abs(e.clientX - dragStart.x)
    setPreviewDuration(calculateDuration(dragDistance))
  }

  const handleMouseUp = e => {
    if (!isDragging) return

    const dragDistance = Math.abs(e.clientX - dragStart.x)
    const duration = calculateDuration(dragDistance)

    setTimers(prevTimers => [
      ...prevTimers,
      {
        id: Date.now(),
        duration,
        position: { x: dragStart.x, y: dragStart.y },
        isNew: true
      }
    ])

    setIsDragging(false)
    setPreviewDuration(null)

    setTimeout(() => {
      setTimers(prevTimers =>
        prevTimers.map(timer =>
          timer.isNew ? { ...timer, isNew: false } : timer
        )
      )
    }, 300)
  }

  const calculateDuration = distance => {
    const intervals = [1, 5, 30, 60, 15 * 60, 30 * 60, 60 * 60]
    const index = Math.min(Math.floor(distance / 50), intervals.length - 1)
    return intervals[index]
  }

  const deleteTimer = useCallback((id, isNonZero) => {
    setTimers(prevTimers => {
      const timerToDelete = prevTimers.find(timer => timer.id === id)
      if (isNonZero) {
        setDeletedTimers(prev => [timerToDelete, ...prev])
      }
      return prevTimers.filter(timer => timer.id !== id)
    })
  }, [])

  const undoDelete = useCallback(() => {
    if (deletedTimers.length > 0) {
      const [timerToRestore, ...remainingDeletedTimers] = deletedTimers
      setTimers(prevTimers => [...prevTimers, timerToRestore])
      setDeletedTimers(remainingDeletedTimers)
    }
  }, [deletedTimers])

  const formatPreviewTime = time => {
    if (time >= 3600) return `${Math.floor(time / 3600)}h`
    if (time >= 60) return `${Math.floor(time / 60)}m`
    return `${time}s`
  }

  const toggleView = () => {
    setIsGridView(prev => !prev)
  }

  return (
    <div
      className={`app ${isGridView ? "grid-view" : ""}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="view-toggle">
        <button onClick={toggleView} className={isGridView ? "active" : ""}>
          <Grid size={24} />
        </button>
        <button onClick={toggleView} className={!isGridView ? "active" : ""}>
          <Move size={24} />
        </button>
      </div>
      <div className="undo-button">
        <button onClick={undoDelete} disabled={deletedTimers.length === 0}>
          <Undo2 size={24} />
        </button>
      </div>
      {timers.map(timer => (
        <TimerBox
          key={timer.id}
          id={timer.id}
          duration={timer.duration}
          position={timer.position}
          onDelete={deleteTimer}
          isNew={timer.isNew}
          isGridView={isGridView}
        />
      ))}
      {isDragging && (
        <>
          <div
            className="drag-indicator"
            style={{
              left: dragStart.x,
              top: dragStart.y,
              width: `${Math.abs(currentPosition.x - dragStart.x)}px`,
              height: "2px"
            }}
          />
          {previewDuration && (
            <div
              className="preview"
              style={{
                left: currentPosition.x,
                top: currentPosition.y
              }}
            >
              {formatPreviewTime(previewDuration)}
            </div>
          )}
        </>
      )}
      <style jsx>{`
        .app {
          background-color: black;
          min-height: 100vh;
          width: 100vw;
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }
        .app.grid-view {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
          padding: 20px;
        }
        .timer-box {
          position: absolute;
          color: white;
          border: 2px solid white;
          padding: 10px 20px;
          font-size: 24px;
          font-family: Arial, sans-serif;
          border-radius: 5px;
          transform: translate(-50%, -50%);
          transition: background-color 0.3s, transform 0.3s;
        }
        .timer-box.grid-view {
          position: relative;
          transform: none;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          box-sizing: border-box;
        }
        .timer-box.completed {
          background-color: red;
        }
        .timer-box.new {
          animation: pop 0.3s ease-out;
        }
        .drag-indicator {
          position: absolute;
          background-color: rgba(255, 255, 255, 0.5);
          height: 2px;
        }
        .preview {
          position: absolute;
          color: white;
          background-color: rgba(255, 255, 255, 0.2);
          padding: 5px 10px;
          border-radius: 3px;
          font-size: 16px;
          transform: translate(10px, 10px);
        }
        .view-toggle,
        .undo-button {
          position: absolute;
          display: flex;
          gap: 10px;
          z-index: 1000;
        }
        .view-toggle {
          top: 20px;
          right: 20px;
        }
        .undo-button {
          top: 20px;
          left: 20px;
        }
        .view-toggle button,
        .undo-button button {
          background-color: rgba(50, 50, 50, 0.7);
          border: none;
          color: white;
          padding: 10px;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        .view-toggle button:hover,
        .view-toggle button.active,
        .undo-button button:hover:not(:disabled) {
          background-color: rgba(80, 80, 80, 0.9);
        }
        .undo-button button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @keyframes pop {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  )
}

export default App
