import "@testing-library/jest-dom";

import { __setTpvDataForTests, type TpvData } from "@/data/tpv";
import tpvFixture from "./fixtures/tpv.json";
import ownersFixture from "./fixtures/clienteProprietario.json";

__setTpvDataForTests(tpvFixture as unknown as TpvData, ownersFixture as Record<string, string>);

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
