import { Request, Response } from 'express';
import { query } from '../config/db';

/**
 * GET /api/settings
 * Retrieve distributor settings and compliance configuration
 */
export async function getSettings(req: Request, res: Response) {
  try {
    const result = await query('SELECT * FROM settings WHERE id = $1', ['fmcg_distributor_settings']);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Settings not initialized',
      });
    }

    const row = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        id: row.id,
        distributorName: row.distributor_name,
        depotAddress: row.depot_address,
        contactPhone: row.contact_phone,
        contactEmail: row.contact_email,
        gstin: row.gstin,
        fssaiLicence: row.fssai_licence,
        panNumber: row.pan_number,
        ewayThreshold: parseFloat(row.eway_threshold) || 50000,
        mandatoryVanSettle: Boolean(row.mandatory_van_settle),
        creditCeilingEnforce: Boolean(row.credit_ceiling_enforce),
        periodLockMonth: row.period_lock_month,
        connectors: {
          compA: Boolean(row.connector_comp_a),
          compB: Boolean(row.connector_comp_b),
          compC: Boolean(row.connector_comp_c),
          tally: Boolean(row.connector_tally),
        },
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message,
    });
  }
}

/**
 * PUT /api/settings
 * Update distributor configuration, tax details, and compliance rules
 */
export async function updateSettings(req: Request, res: Response) {
  try {
    const {
      distributorName,
      depotAddress,
      contactPhone,
      contactEmail,
      gstin,
      fssaiLicence,
      panNumber,
      ewayThreshold,
      mandatoryVanSettle,
      creditCeilingEnforce,
      periodLockMonth,
      connectors = {},
    } = req.body;

    await query(
      `UPDATE settings
       SET distributor_name = COALESCE($1, distributor_name),
           depot_address = COALESCE($2, depot_address),
           contact_phone = COALESCE($3, contact_phone),
           contact_email = COALESCE($4, contact_email),
           gstin = COALESCE($5, gstin),
           fssai_licence = COALESCE($6, fssai_licence),
           pan_number = COALESCE($7, pan_number),
           eway_threshold = COALESCE($8, eway_threshold),
           mandatory_van_settle = COALESCE($9, mandatory_van_settle),
           credit_ceiling_enforce = COALESCE($10, credit_ceiling_enforce),
           period_lock_month = COALESCE($11, period_lock_month),
           connector_comp_a = COALESCE($12, connector_comp_a),
           connector_comp_b = COALESCE($13, connector_comp_b),
           connector_comp_c = COALESCE($14, connector_comp_c),
           connector_tally = COALESCE($15, connector_tally),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 'fmcg_distributor_settings'`,
      [
        distributorName,
        depotAddress,
        contactPhone,
        contactEmail,
        gstin,
        fssaiLicence,
        panNumber,
        ewayThreshold,
        mandatoryVanSettle,
        creditCeilingEnforce,
        periodLockMonth,
        connectors.compA,
        connectors.compB,
        connectors.compC,
        connectors.tally,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Settings and compliance controls saved permanently in Neon DB!',
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message,
    });
  }
}
