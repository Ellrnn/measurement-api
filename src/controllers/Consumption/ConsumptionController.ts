import { Request, Response } from "express";
import * as v from "valibot";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

import message from "../../utils/message";
import { Database } from "../../../db/database";
import { MeasureRead } from "../../../db/models/MeasureRead";
import { GeminiClient } from "../../clients/geminiClient";
import { createTempUrlFromBase64 } from "../../utils/blob";
import {
  MeasureTypeSchema,
  UploadValueSchema,
  UUIDSchema,
  ValueConfirmSchema,
} from "./Schema";

const dbPool = Database.getInstance().pool;

export async function getListByCustomer(request: Request, response: Response) {
  const { customerCode } = request.params;
  const { measure_type } = request.query;

  const customerCodeValidation = v.safeParse(UUIDSchema, customerCode);
  const measureTypeValidation = v.safeParse(
    MeasureTypeSchema,
    measure_type?.toString().toUpperCase()
  );

  if (!customerCodeValidation.success) {
    return response.status(400).json({
      error_code: "INVALID_CUSTOMER_CODE",
      error_description: "Customer code is invalid.",
    });
  }

  if (measure_type && !measureTypeValidation.success) {
    return response.status(400).json({
      error_code: "INVALID_TYPE",
      error_description: message.errors.INVALID_TYPE,
    });
  }

  try {
    let query =
      "SELECT measure_uuid, measure_datetime, measure_type, has_confirmed, image_url FROM measure_read WHERE customer_code = $1";
    const queryParams: string[] = [customerCodeValidation.output];

    if (measureTypeValidation.success) {
      query += " AND measure_type = $2";
      queryParams.push(measureTypeValidation.output);
    }

    const queryMeasures = await dbPool.query<MeasureRead>(query, queryParams);

    if (!queryMeasures.rows.length) {
      return response.status(404).json({
        error_code: "MEASURES_NOT_FOUND",
        error_description: message.errors.MEASURES_NOT_FOUND,
      });
    }

    return response.status(200).json({
      customer_code: customerCodeValidation.output,
      measures: queryMeasures.rows,
    });
  } catch (error) {
    console.error(error);
  }
}

export async function patchValueConfirm(request: Request, response: Response) {
  const bodyValidation = v.safeParse(ValueConfirmSchema, request.body);

  if (!bodyValidation.success) {
    return response.status(400).json({
      error_code: "INVALID_DATA",
      error_description: bodyValidation.issues.map((m) => {
        return {
          field: m.path?.map((p) => p.key).join("."),
          message: m.message,
        };
      }),
    });
  }

  const output = bodyValidation.output;

  const queryExistCode = await dbPool.query(
    "SELECT measure_uuid FROM measure_read WHERE measure_uuid = $1",
    [output.measure_uuid]
  );
  if (!queryExistCode.rows.length) {
    return response.status(404).json({
      error_code: "MEASURE_NOT_FOUND",
      error_description: message.errors.MEASURE_UUID_NOT_FOUND,
    });
  }

  const queryConfirmed = await dbPool.query(
    "SELECT has_confirmed FROM measure_read WHERE measure_uuid = $1 AND has_confirmed IS TRUE",
    [output.measure_uuid]
  );
  if (queryConfirmed.rows.length) {
    return response.status(409).json({
      error_code: "CONFIRMATION_DUPLICATE",
      error_description: message.errors.CONFIRMATION_DUPLICATE,
    });
  }

  await dbPool.query(
    "UPDATE measure_read SET measure_value = $1, has_confirmed = TRUE WHERE measure_uuid = $2",
    [output.confirmed_value, output.measure_uuid]
  );
  return response.status(200).json({
    success: true,
  });
}

export async function uploadValue(request: Request, response: Response) {
  const bodyValidation = v.safeParse(UploadValueSchema, request.body);

  if (!bodyValidation.success) {
    return response.status(400).json({
      error_code: "INVALID_DATA",
      error_description: bodyValidation.issues.map((m) => {
        return {
          field: m.path?.map((p) => p.key).join("."),
          message: m.message,
        };
      }),
    });
  }

  const output = bodyValidation.output;

  const queryResult = await dbPool.query<MeasureRead>(
    `SELECT * FROM measure_read mr WHERE customer_code = $1 AND measure_type = $2`,
    [output.customer_code, output.measure_type]
  );

  if (queryResult.rows.length) {
    const rowsMonthYear = queryResult.rows[0].measure_datetime
      .toISOString()
      .slice(0, 7);
    const outputMonthYear = output.measure_datetime.slice(0, 7);
    if (rowsMonthYear === outputMonthYear) {
      return response.status(409).json({
        error_code: "DOUBLE_REPORT",
        error_description: message.errors.DOUBLE_REPORT,
      });
    }
  }

  const filePart1 = {
    inlineData: {
      data: output.image,
      mimeType: "image/png",
    },
  };

  const prompt =
    "existe um medidor na imagem, quais os numeros indicados no medidor? responda somente com numeros e com ponto caso seja decimal ";
  const imageParts = [filePart1];

  const geminiClient = new GeminiClient();

  const generatedContent = await geminiClient.readMeasure.generateContent([
    prompt,
    ...imageParts,
  ]);

  const imageUUID = randomUUID();
  const measureValue = Number(
    generatedContent.response.text().replace(/\D/g, "")
  );

  await fs.writeFile(`public/${imageUUID}.png`, output.image, {
    encoding: "base64",
  });
  const apiAssetsURL = `${request.protocol}://${request.get("host")}`;
  const imageUrl = `${apiAssetsURL}/public/${imageUUID}.png`;

  const insertMeasure = await dbPool.query<Pick<MeasureRead, "measure_uuid">>(
    "INSERT INTO measure_read(customer_code, measure_datetime, measure_type, measure_value, image_url) VALUES($1, $2, $3, $4, $5) RETURNING measure_uuid",
    [
      output.customer_code,
      output.measure_datetime,
      output.measure_type,
      measureValue,
      imageUrl,
    ]
  );

  return response.status(200).json({
    image_url: imageUrl,
    measure_value: measureValue,
    measure_uuid: insertMeasure.rows[0].measure_uuid,
  });
}
