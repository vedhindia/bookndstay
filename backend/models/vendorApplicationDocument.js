module.exports = (sequelize, DataTypes) => {
  const VendorApplicationDocument = sequelize.define(
    'VendorApplicationDocument',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      application_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      doc_type: { type: DataTypes.ENUM('GST', 'HOTEL_LICENSE'), allowNull: false },
      file_path: { type: DataTypes.STRING(500), allowNull: false },
      original_name: { type: DataTypes.STRING, allowNull: true },
      mime_type: { type: DataTypes.STRING, allowNull: true },
      file_size: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    {
      tableName: 'vendor_application_documents',
      timestamps: true,
      underscored: false,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    }
  );

  return VendorApplicationDocument;
};
