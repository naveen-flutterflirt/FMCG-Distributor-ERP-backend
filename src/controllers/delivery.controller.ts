import { Request, Response } from 'express';
import { query } from '../config/db';

/**
 * GET /api/delivery/trips
 * Real-time active delivery fleet trips from Neon PostgreSQL
 */
export async function getDeliveryTrips(req: Request, res: Response) {
  try {
    const tripsRes = await query('SELECT * FROM delivery_trips ORDER BY id ASC');
    const trips = tripsRes.rows.map((t) => ({
      id: t.id,
      route: t.route,
      vehicle: t.vehicle,
      driver: t.driver,
      totalDrops: parseInt(t.total_drops, 10),
      delivered: parseInt(t.delivered, 10),
      pending: parseInt(t.pending, 10),
      valueToCollect: parseFloat(t.value_to_collect) || 0,
      collectedSoFar: parseFloat(t.collected_so_far) || 0,
      status: t.status,
      casesLoaded: parseInt(t.cases_loaded, 10),
      tripDate: t.trip_date,
    }));

    // Fleet Metrics
    const totalVehicles = trips.length;
    const totalDrops = trips.reduce((acc, t) => acc + t.totalDrops, 0);
    const completedDrops = trips.reduce((acc, t) => acc + t.delivered, 0);
    const totalCollectedAtDoor = trips.reduce((acc, t) => acc + t.collectedSoFar, 0);

    return res.status(200).json({
      success: true,
      data: {
        trips,
        summary: {
          totalVehicles,
          totalDrops,
          completedDrops,
          completionPct: totalDrops > 0 ? Math.round((completedDrops / totalDrops) * 100) : 0,
          totalCollectedAtDoor,
          costPerCase: 4.2,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching delivery trips:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery trips',
      error: error.message,
    });
  }
}

/**
 * POST /api/delivery/plan-trip
 * Create a new planned delivery trip
 */
export async function createDeliveryTrip(req: Request, res: Response) {
  try {
    const { route, vehicle, driver, totalDrops, casesLoaded, valueToCollect } = req.body;

    const newId = `TRIP-${Date.now().toString().slice(-4)}`;
    const drops = parseInt(totalDrops, 10) || 15;
    const cases = parseInt(casesLoaded, 10) || 120;
    const val = parseFloat(valueToCollect) || 18500;

    await query(
      `INSERT INTO delivery_trips (id, route, vehicle, driver, total_drops, delivered, pending, value_to_collect, collected_so_far, status, cases_loaded, trip_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        newId,
        route || 'R1 Civil Lines',
        vehicle || 'Tata Ace (UP-80-AT-1122)',
        driver || 'Ramesh Kumar',
        drops,
        0,
        drops,
        val,
        0,
        'Scheduled',
        cases,
        new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Delivery trip ${newId} created and dispatched!`,
    });
  } catch (error: any) {
    console.error('Error creating trip:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create trip',
      error: error.message,
    });
  }
}
