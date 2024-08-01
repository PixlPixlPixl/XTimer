import React, { useState, useEffect, useRef, useCallback } from "react"
import { Grid, Move, Undo2 } from "lucide-react"
import beep from './beep_alarm.mp3';
import './App.css'

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
    const audio = audioRef.current;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 0) {
          clearInterval(intervalRef.current);
          setIsCompleted(true);
          audio.loop = true;
          audio.play();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  
    return () => {
      clearInterval(intervalRef.current);
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

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
    </div>
  )
}

export default App