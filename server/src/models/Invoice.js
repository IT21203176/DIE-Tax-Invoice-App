import mongoose from 'mongoose';

const { Schema } = mongoose;

const partySchema = ({ tinRequired }) =>
  new Schema(
    {
      tin: tinRequired
        ? { type: String, trim: true, required: true }
        : { type: String, trim: true, default: '' },
      name: { type: String, trim: true, required: true },
      address: { type: String, trim: true, required: true },
      telephone: { type: String, trim: true, default: '' },
    },
    { _id: false }
  );

const vehicleItemSchema = new Schema(
  {
    make: { type: String, trim: true, required: true },
    model: { type: String, trim: true, required: true },
    status: { type: String, trim: true, default: '' },
    chassisNumber: { type: String, trim: true, uppercase: true, required: true },
    engineNumber: { type: String, trim: true, uppercase: true, required: true },
    color: { type: String, trim: true, default: '' },
    engineCapacityCc: { type: String, trim: true, uppercase: true, default: '' },
    yearOfManufacture: { type: Number, min: 1900, max: 2100 },
    fuelType: { type: String, trim: true, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    amountIncludingVat: { type: Number, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, trim: true, required: true, unique: true },
    invoiceDate: { type: Date, required: true },

    supplier: { type: partySchema({ tinRequired: true }), required: true },
    purchaser: { type: partySchema({ tinRequired: false }), required: true },

    deliveryDate: { type: Date },
    placeOfSupply: { type: String, trim: true, default: '' },
    otherInformation: { type: String, trim: true, default: '' },

    items: {
      type: [vehicleItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'At least one vehicle is required',
      },
    },

    totalValueOfSupply: { type: Number, required: true, min: 0 },
    vatRate: { type: Number, required: true, min: 0 },
    vatAmount: { type: Number, required: true, min: 0 },
    totalAmountIncludingVat: { type: Number, required: true, min: 0 },
    totalAmountInWords: { type: String, required: true },

    paymentMode: { type: String, trim: true, required: true },
  },
  { timestamps: true }
);

invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ 'purchaser.name': 1 });
invoiceSchema.index({ 'items.chassisNumber': 1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
