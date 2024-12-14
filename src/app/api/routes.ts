import { getStravaActivities } from '@/lib/strava'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const kmRun = await getStravaActivities(new Date('2024-01-01'))
    const smsCount = await fetch('your-php-api-endpoint').then(r => r.json())
    
    return NextResponse.json({
      kmRun,
      smsCount,
      kmGoal: 6000,
      smsGoal: 6000
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}