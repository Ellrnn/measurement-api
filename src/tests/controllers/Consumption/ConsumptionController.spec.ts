import { randomUUID } from "crypto";

import { Request, Response } from "express";
import * as v from "valibot";
import "@valibot/i18n/pt";

const mockQuery = jest.fn();
const mockGenerateContent = jest.fn();
const mockRandomUUID = jest.fn();
v.setGlobalConfig({ lang: "pt" });

jest.mock("../../../../db/database", () => {
  return {
    Database: {
      getInstance: jest.fn().mockReturnValue({
        pool: {
          query: mockQuery,
        },
      }),
    },
  };
});

jest.mock("../../../clients/geminiClient", () => {
  return {
    GeminiClient: jest.fn().mockImplementation(() => ({
      readMeasure: {
        generateContent: mockGenerateContent,
      },
    })),
  };
});

jest.mock("node:crypto", () => ({
  randomUUID: mockRandomUUID,
}));

jest.mock("node:fs/promises", () => ({
  writeFile: jest.fn(),
}));

import {
  getListByCustomer,
  patchValueConfirm,
  uploadValue,
} from "../../../controllers/Consumption/ConsumptionController";
import message from "../../../utils/message";

describe("ConsumptionController", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();

    mockRequest = { protocol: "http" };
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockQuery.mockClear();
    mockGenerateContent.mockClear();
    mockRandomUUID.mockClear(); // Clear any previous invocations
  });

  describe("getListByCustomer", () => {
    it("should return 400 if customerCode is invalid", async () => {
      mockRequest.params = { customerCode: "invalid-uuid" };
      mockRequest.query = {};

      await getListByCustomer(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error_code: "INVALID_CUSTOMER_CODE",
        error_description: "Customer code is invalid.",
      });
    });

    it("should return 400 if measure_type is invalid", async () => {
      const validUUID = randomUUID();
      mockRequest.params = { customerCode: validUUID };
      mockRequest.query = { measure_type: "invalid-type" };

      await getListByCustomer(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error_code: "INVALID_TYPE",
        error_description: message.errors.INVALID_TYPE,
      });
    });

    it("should return 404 if no measures are found", async () => {
      const validUUID = randomUUID();
      mockRequest.params = { customerCode: validUUID };
      mockRequest.query = { measure_type: "WATER" };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await getListByCustomer(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error_code: "MEASURES_NOT_FOUND",
        error_description: message.errors.MEASURES_NOT_FOUND,
      });
    });

    it("should return 200 with measures if found", async () => {
      const validUUID = randomUUID();
      const mockMeasures = [
        {
          measure_uuid: randomUUID(),
          measure_datetime: "2024-08-30T12:00:00Z",
          measure_type: "WATER",
          has_confirmed: true,
          image_url: "http://example.com/image1.png",
        },
      ];

      mockRequest.params = { customerCode: validUUID };
      mockRequest.query = { measure_type: "WATER" };

      mockQuery.mockResolvedValueOnce({ rows: mockMeasures });

      await getListByCustomer(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        customer_code: validUUID,
        measures: mockMeasures,
      });
    });

    it("should be case insensitive for measure_type", async () => {
      const validUUID = randomUUID();
      const mockMeasures = [
        {
          measure_uuid: randomUUID(),
          measure_datetime: "2024-08-30T12:00:00Z",
          measure_type: "WATER",
          has_confirmed: true,
          image_url: "http://example.com/image1.png",
        },
      ];

      mockRequest.params = { customerCode: validUUID };
      mockRequest.query = { measure_type: "water" };

      mockQuery.mockResolvedValueOnce({ rows: mockMeasures });

      await getListByCustomer(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        customer_code: validUUID,
        measures: mockMeasures,
      });
    });

    it("should handle exceptions and log error", async () => {
      const validUUID = randomUUID();
      mockRequest.params = { customerCode: validUUID };
      mockRequest.query = { measure_type: "GAS" };

      const consoleErrorMock = jest
        .spyOn(console, "error")
        .mockImplementation();

      mockQuery.mockRejectedValueOnce(new Error("DB Error"));

      await getListByCustomer(mockRequest as Request, mockResponse as Response);

      expect(consoleErrorMock).toHaveBeenCalledWith(new Error("DB Error"));

      consoleErrorMock.mockRestore();
    });
  });

  describe("patchValueConfirm", () => {
    it("should return 400 if measure_uuid is invalid", async () => {
      mockRequest.body = {
        measure_uuid: "1234567",
        confirmed_value: 2500,
      };
      await patchValueConfirm(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error_code: "INVALID_DATA",
        error_description: [
          { field: "measure_uuid", message: "Formato UUID inválido." },
        ],
      });
    });

    it("should return 400 if confirmed_value is invalid", async () => {
      mockRequest.body = {
        measure_uuid: randomUUID(),
        confirmed_value: "2500",
      };
      await patchValueConfirm(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error_code: "INVALID_DATA",
        error_description: [
          {
            field: "confirmed_value",
            message:
              'Tipo inválido: Esperado number, porém foi recebido "2500"',
          },
        ],
      });
    });

    it("should return 404 if measure read not found", async () => {
      mockRequest.body = {
        measure_uuid: randomUUID(),
        confirmed_value: 2500,
      };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await patchValueConfirm(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error_code: "MEASURE_NOT_FOUND",
        error_description: message.errors.MEASURE_UUID_NOT_FOUND,
      });
    });

    it("should return 409 if measure read is duplicate", async () => {
      mockRequest.body = {
        measure_uuid: randomUUID(),
        confirmed_value: 2500,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ measure_uuid: randomUUID() }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ has_confirmed: true }] });

      await patchValueConfirm(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error_code: "CONFIRMATION_DUPLICATE",
        error_description: message.errors.CONFIRMATION_DUPLICATE,
      });
    });

    it("should return 200 and update the measure when successful", async () => {
      mockRequest.body = {
        measure_uuid: randomUUID(),
        confirmed_value: 2500,
      };
      mockQuery.mockResolvedValueOnce({
        rows: [{ measure_uuid: "valid-uuid" }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({});

      await patchValueConfirm(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
      });
    });
  });

  describe("uploadValue", () => {
    it("should return 400 if image is invalid", async () => {
      mockRequest.body = {
        image: "image",
        customer_code: randomUUID(),
        measure_datetime: "2023-08-31T00:00",
        measure_type: "GAS",
      };
      await uploadValue(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error_code: "INVALID_DATA",
        error_description: [
          {
            field: "image",
            message: "Formato string de base64 inválido.",
          },
        ],
      });
    });

    it("should return 400 if customer_code is invalid", async () => {
      mockRequest.body = {
        image: btoa("image"),
        customer_code: "12345",
        measure_datetime: "2023-08-31T00:00",
        measure_type: "GAS",
      };
      await uploadValue(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error_code: "INVALID_DATA",
        error_description: [
          {
            field: "customer_code",
            message: "Formato UUID inválido.",
          },
        ],
      });
    });

    it("should return 400 if measure_datetime is invalid", async () => {
      mockRequest.body = {
        image: btoa("image"),
        customer_code: randomUUID(),
        measure_datetime: "2023-08-31 00:00",
        measure_type: "GAS",
      };
      await uploadValue(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error_code: "INVALID_DATA",
        error_description: [
          {
            field: "measure_datetime",
            message: "Formato Data e Hora inválido.",
          },
        ],
      });
    });

    it("should return 400 if measure_type is invalid", async () => {
      mockRequest.body = {
        image: btoa("image"),
        customer_code: randomUUID(),
        measure_datetime: "2023-08-31T00:00",
        measure_type: "GASs",
      };
      await uploadValue(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error_code: "INVALID_DATA",
        error_description: [
          {
            field: "measure_type",
            message:
              'Tipo inválido: Esperado ("WATER" | "GAS"), porém foi recebido "GASs"',
          },
        ],
      });
    });

    it("should return 409 if read exist for this type in the current month", async () => {
      mockRequest.body = {
        image: btoa("image"),
        customer_code: randomUUID(),
        measure_datetime: "2023-08-31T00:00",
        measure_type: "GAS",
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ measure_datetime: new Date("2023-08-31T00:00") }],
      });

      await uploadValue(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error_code: "DOUBLE_REPORT",
        error_description: message.errors.DOUBLE_REPORT,
      });
    });

    it("should return 200 and return the measurement read by the API", async () => {
      const measure_uuid = randomUUID();
      mockRequest.get = (() =>
        "temp-url.com") as unknown as typeof mockRequest.get;

      mockRequest.body = {
        image: btoa("image"),
        customer_code: randomUUID(),
        measure_datetime: "2023-08-31T00:00",
        measure_type: "GAS",
      };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: jest.fn().mockReturnValue("12345") },
      });

      mockRandomUUID.mockReturnValue(measure_uuid);

      mockQuery.mockResolvedValueOnce({
        rows: [{ measure_uuid }],
      });

      await uploadValue(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        image_url: `http://temp-url.com/public/${measure_uuid}.png`,
        measure_value: 12345,
        measure_uuid,
      });
    });
  });
});
