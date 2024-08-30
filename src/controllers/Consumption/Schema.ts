import * as v from "valibot";

import message from "../../utils/message";

export const UUIDSchema = v.pipe(
  v.string(),
  v.uuid(message.errors.INVALID_UUID)
);
export const MeasureTypeSchema = v.union([
  v.literal("WATER"),
  v.literal("GAS"),
]);

export const ValueConfirmSchema = v.object({
  measure_uuid: UUIDSchema,
  confirmed_value: v.pipe(v.number(), v.integer()),
});

export const UploadValueSchema = v.object({
  image: v.pipe(v.string(), v.base64(message.errors.INVALID_BASE64)),
  customer_code: UUIDSchema,
  measure_datetime: v.pipe(
    v.string(),
    v.isoDateTime(message.errors.INVALID_DATE_TIME)
  ),
  measure_type: MeasureTypeSchema,
});
