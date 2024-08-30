export type MeasureRead = {
  measure_read_id: number;
  measure_uuid: string;
  measure_datetime: Date;
  measure_type: string;
  measure_value: number;
  image_url: string;
  customer_code: string;
  has_confirmed: boolean;
};
