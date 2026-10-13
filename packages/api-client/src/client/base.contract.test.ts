// @vitest-environment node

import { describe, expect, it } from "vitest";
import { api } from "./base";

const contract = {
  baseUrl: process.env.API_CONTRACT_BASE_URL ?? "http://127.0.0.1:4000/api/v1",
  phone: process.env.API_CONTRACT_PHONE,
  password: process.env.API_CONTRACT_PASSWORD,
  otp: process.env.API_CONTRACT_OTP,
  seeded: process.env.API_CONTRACT_SEEDED === "true",
};

const canRun = Boolean(contract.phone && contract.password && (contract.seeded || contract.otp));

describe.skipIf(!canRun)("API contract against a running backend", () => {
  it("authenticates and reads /me (registering first when not seeded)", async () => {
    if (!contract.seeded) {
      const consents = [
        "TERMS_OF_SERVICE",
        "PRIVACY_POLICY",
        "SAFETY_POLICY",
        "PROHIBITED_ITEMS_POLICY",
        "OFFLINE_PAYMENT_TERMS",
      ].map((type) => ({ type, version: "1.0" }));

      await api("POST", "/auth/register", {
        baseUrl: contract.baseUrl,
        body: {
          name: "API contract test",
          phone: contract.phone,
          password: contract.password,
          consents,
        },
      });
      await api("POST", "/auth/otp/verify", {
        baseUrl: contract.baseUrl,
        body: { phone: contract.phone, code: contract.otp },
      });
    }

    const login = await api<{ accessToken: string }>("POST", "/auth/login", {
      baseUrl: contract.baseUrl,
      headers: { "X-Client": "mobile" },
      body: { phone: contract.phone, password: contract.password },
    });
    expect(login.data.accessToken).toBeTruthy();

    const me = await api<{ id: string; phone: string }>("GET", "/me", {
      baseUrl: contract.baseUrl,
      headers: { Authorization: `Bearer ${login.data.accessToken}` },
    });
    expect(me.data).toMatchObject({ phone: contract.phone });
    expect(me.data.id).toBeTruthy();
  });
});
