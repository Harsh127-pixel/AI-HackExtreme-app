import { useState, useEffect } from 'react'

export default function useStreak() {
  const [streak, setStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('mindease_streak') || '{}')
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      
      let current = data.current || 0
      let longest = data.longest || 0
      const lastCheckin = data.lastCheckin

      if (lastCheckin === today) {
        // Already checked in today, keep streak
      } else if (lastCheckin === yesterday) {
        // Consecutive day
        current += 1
      } else if (!lastCheckin) {
        current = 1
      } else {
        // Streak broken
        current = 1
      }

      longest = Math.max(longest, current)
      
      localStorage.setItem('mindease_streak', JSON.stringify({
        current, longest, lastCheckin: today
      }))

      setStreak(current)
      setLongestStreak(longest)
    } catch (e) {}
  }, [])

  return { streak, longestStreak }
}
