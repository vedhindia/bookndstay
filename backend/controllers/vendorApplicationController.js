const { Vendor, VendorApplication, VendorApplicationDocument, sequelize } = require('../models');
const { asyncHandler } = require('../middlewares/errorHandler');
const { validateRequiredFields, isValidEmail } = require('../utils/validationHelper');
const { notifyAdmins } = require('../utils/notificationHub');

module.exports = {
  apply: asyncHandler(async (req, res) => {
    const {
      full_name,
      email,
      phone,
      business_name,
      business_address,
      business_doc_type,
      gst_number,
      hotel_license_number,
    } = req.body || {};

    const acceptTermsRaw = req.body?.accept_terms ?? req.body?.acceptTerms;
    const acceptTerms = (() => {
      if (acceptTermsRaw === true) return true;
      const v = String(acceptTermsRaw ?? '').trim().toLowerCase();
      return v === 'true' || v === '1' || v === 'yes' || v === 'on';
    })();
    if (!acceptTerms) {
      return res.status(400).json({ message: 'You must agree to the terms and conditions' });
    }

    const validation = validateRequiredFields(req.body || {}, [
      'full_name',
      'email',
      'phone',
      'business_name',
      'business_address',
      'business_doc_type',
      'hotel_license_number',
    ]);
    if (!validation.isValid) {
      return res.status(400).json({ message: `Missing required fields: ${validation.missingFields.join(', ')}` });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existingVendor = await Vendor.findOne({ where: { email: normalizedEmail } });
    if (existingVendor) {
      return res.status(409).json({ message: 'Vendor already exists with this email' });
    }

    const gstFile = req.files?.gst?.[0];
    const hotelLicenseFile = req.files?.hotel_license?.[0];
    if (!gstFile || !hotelLicenseFile) {
      return res.status(400).json({ message: 'Business document and Hotel License documents are required' });
    }

    const normalizeDocType = (raw) => {
      const v = String(raw || '').trim().toUpperCase().replace(/\s+/g, '_');
      if (v === 'GST') return 'GST_REGISTRATION_CERTIFICATE';
      if (v === 'GST_REGISTRATION') return 'GST_REGISTRATION_CERTIFICATE';
      if (v === 'GST_REGISTRATION_CERTIFICATE') return 'GST_REGISTRATION_CERTIFICATE';
      if (v === 'SHOP_ACT_LICENSE') return 'SHOP_ACT_LICENSE';
      if (v === 'SHOP_ACT') return 'SHOP_ACT_LICENSE';
      if (v === 'MSME') return 'MSME_UDYAM_CERTIFICATE';
      if (v === 'UDYAM') return 'MSME_UDYAM_CERTIFICATE';
      if (v === 'MSME_UDYAM_CERTIFICATE') return 'MSME_UDYAM_CERTIFICATE';
      if (v === 'COMPANY_INCORPORATION_CERTIFICATE') return 'COMPANY_INCORPORATION_CERTIFICATE';
      if (v === 'INCORPORATION_CERTIFICATE') return 'COMPANY_INCORPORATION_CERTIFICATE';
      if (v === 'PARTNERSHIP_DEED') return 'PARTNERSHIP_DEED';
      return '';
    };

    const normalizedDocType = normalizeDocType(business_doc_type);
    if (!normalizedDocType) {
      return res.status(400).json({ message: 'Invalid business document type' });
    }
    if (normalizedDocType === 'GST_REGISTRATION_CERTIFICATE' && !String(gst_number || '').trim()) {
      return res.status(400).json({ message: 'GST number is required for GST Registration Certificate' });
    }

    const result = await sequelize.transaction(async (t) => {
      const existingApp = await VendorApplication.findOne({
        where: { email: normalizedEmail },
        transaction: t,
      });

      const payload = {
        full_name: String(full_name).trim(),
        email: normalizedEmail,
        phone: String(phone).trim(),
        business_name: String(business_name).trim(),
        business_address: String(business_address).trim(),
        gst_number: normalizedDocType === 'GST_REGISTRATION_CERTIFICATE' ? String(gst_number).trim() : null,
        hotel_license_number: String(hotel_license_number).trim(),
        status: 'SUBMITTED',
        rejection_reason: null,
      };

      let application;
      if (!existingApp) {
        application = await VendorApplication.create(payload, { transaction: t });
      } else {
        if (existingApp.status === 'APPROVED') {
          const err = new Error('Application already approved');
          err.statusCode = 409;
          throw err;
        }
        application = await existingApp.update(payload, { transaction: t });
        await VendorApplicationDocument.destroy({
          where: { application_id: application.id },
          transaction: t,
        });
      }

      const docs = [
        {
          application_id: application.id,
          doc_type: normalizedDocType,
          file_path: `/uploads/${gstFile.filename}`,
          original_name: gstFile.originalname,
          mime_type: gstFile.mimetype,
          file_size: gstFile.size,
        },
        {
          application_id: application.id,
          doc_type: 'HOTEL_LICENSE',
          file_path: `/uploads/${hotelLicenseFile.filename}`,
          original_name: hotelLicenseFile.originalname,
          mime_type: hotelLicenseFile.mimetype,
          file_size: hotelLicenseFile.size,
        },
      ];

      await VendorApplicationDocument.bulkCreate(docs, { transaction: t });

      const saved = await VendorApplication.findByPk(application.id, {
        include: [{ model: VendorApplicationDocument, as: 'documents' }],
        transaction: t,
      });

      return saved;
    });

    try {
      notifyAdmins({ section: 'vendor_applications', id: result?.id });
    } catch {
      void 0;
    }
    return res.status(201).json({
      success: true,
      message: 'Vendor application submitted successfully',
      data: { application: result },
    });
  }),
};
