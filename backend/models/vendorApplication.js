module.exports = (sequelize, DataTypes) => {
  const VendorApplication = sequelize.define(
    'VendorApplication',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      full_name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      phone: { type: DataTypes.STRING, allowNull: true },
      business_name: { type: DataTypes.STRING, allowNull: true },
      business_address: { type: DataTypes.TEXT, allowNull: true },
      gst_number: { type: DataTypes.STRING, allowNull: true },
      hotel_license_number: { type: DataTypes.STRING, allowNull: true },
      status: {
        type: DataTypes.ENUM('SUBMITTED', 'APPROVED', 'REJECTED', 'NEED_MORE_INFO'),
        allowNull: false,
        defaultValue: 'SUBMITTED',
      },
      admin_notes: { type: DataTypes.TEXT, allowNull: true },
      rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'vendor_applications',
      timestamps: true,
      underscored: false,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    }
  );

  return VendorApplication;
};
