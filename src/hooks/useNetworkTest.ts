import { useState, useEffect } from "react";

/**
 * Simple network test hook to debug network connectivity issues
 */
export function useNetworkTest() {
  const [testResults, setTestResults] = useState<{
    httpbin: boolean;
    metApi: boolean;
    error: string | undefined;
  }>({ httpbin: false, metApi: false, error: undefined });

  useEffect(() => {
    async function runTests() {
      const results: { httpbin: boolean; metApi: boolean; error: string | undefined } = { 
        httpbin: false, 
        metApi: false, 
        error: undefined 
      };

      try {
        // Test 1: Simple HTTP request
        console.log("Testing httpbin.org...");
        const httpbinResponse = await fetch("https://httpbin.org/get");
        results.httpbin = httpbinResponse.ok;
        console.log("httpbin test result:", results.httpbin);
      } catch (err) {
        console.error("httpbin test failed:", err);
        results.error = `httpbin failed: ${err instanceof Error ? err.message : String(err)}`;
      }

      try {
        // Test 2: MET API request
        console.log("Testing MET API...");
        const metResponse = await fetch(
          "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.9139&lon=10.7522",
        );
        results.metApi = metResponse.ok;
        console.log("MET API test result:", results.metApi);
      } catch (err) {
        console.error("MET API test failed:", err);
        results.error = results.error
          ? `${results.error}; MET API failed: ${err instanceof Error ? err.message : String(err)}`
          : `MET API failed: ${err instanceof Error ? err.message : String(err)}`;
      }

      setTestResults(results);
    }

    runTests();
  }, []);

  return testResults;
}
