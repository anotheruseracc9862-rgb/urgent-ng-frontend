import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export const base = [...nextVitals, ...nextTs];
export default base;
