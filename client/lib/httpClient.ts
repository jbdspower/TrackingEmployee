// Robust HTTP client that works around third-party service interference like FullStory
export class HttpClient {
  private static baseUrl = "";
  private static isInitialized = false;
  private static useXHROnly = false;
  private static pendingRequests = new Map<string, Promise<Response>>();

  static init() {
    if (typeof window !== "undefined") {
      this.baseUrl = window.location.origin;
      this.isInitialized = true;

      console.log(`HttpClient: Initializing with baseUrl: ${this.baseUrl}`);
      console.log("HttpClient: Checking for fetch interference");

      // Detect FullStory or other fetch interceptors
      this.detectFetchInterference();

      console.log(
        `HttpClient: Initialization complete. XHR mode: ${this.useXHROnly}`,
      );
    }
  }

  private static ensureInitialized() {
    if (!this.isInitialized && typeof window !== "undefined") {
      this.init();
    }

    // Fallback if baseUrl is still empty
    if (!this.baseUrl && typeof window !== "undefined") {
      this.baseUrl = window.location.origin;
      console.log(`HttpClient: Fallback baseUrl set to: ${this.baseUrl}`);
    }
  }

  // Detect if fetch has been overridden by third-party scripts
  private static detectFetchInterference(): void {
    try {
      console.log("HttpClient: Checking for fetch interference...");

      // Check for FullStory specifically
      const checks = {
        windowFS: !!(window as any).FS,
        fullstoryScript: !!document.querySelector('script[src*="fullstory"]'),
        fsScript: !!document.querySelector('script[src*="fs.js"]'),
        userAgent: /fullstory/i.test(navigator.userAgent),
        fetchContainsFsJs: window.fetch.toString().includes("fs.js"),
        fetchTooShort: window.fetch.toString().length < 50,
      };

      console.log("HttpClient: FullStory detection checks:", checks);

      const hasFullStory = Object.values(checks).some((check) => check);

      if (hasFullStory) {
        console.warn(
          "FullStory detected - switching to XMLHttpRequest mode immediately",
        );
        // Force XHR mode immediately when FullStory is detected
        this.useXHROnly = true;
        return;
      }

      // Additional check for other interceptors
      const originalFetch = window.fetch.toString();
      console.log("HttpClient: Fetch function length:", originalFetch.length);

      if (
        originalFetch.includes("eval") ||
        originalFetch.includes("intercept") ||
        originalFetch.includes("proxy")
      ) {
        console.warn(
          "Fetch interception detected - switching to XMLHttpRequest mode immediately",
        );
        // Force XHR mode immediately when interception is detected
        this.useXHROnly = true;
        return;
      }

      console.log(
        "HttpClient: No fetch interference detected, using native fetch",
      );
    } catch (error) {
      console.warn(
        "Could not detect fetch interference, using XMLHttpRequest as fallback",
      );
      this.useXHROnly = true;
    }
  }

  // Public method to force XMLHttpRequest mode
  static forceXHRMode(): void {
    console.log("HttpClient: Forced to use XMLHttpRequest mode");
    this.useXHROnly = true;
  }

  // Public method to check if in XHR mode
  static isUsingXHR(): boolean {
    return this.useXHROnly;
  }

  // Test connection method
  static async testConnection(): Promise<boolean> {
    try {
      console.log("HttpClient: Testing connection...");
      const response = await this.get("/api/employees", false); // No retry
      const success = response.ok;
      console.log(
        `HttpClient: Connection test ${success ? "passed" : "failed"} - Status: ${response.status}`,
      );
      return success;
    } catch (error) {
      console.error("HttpClient: Connection test failed:", error);
      return false;
    }
  }

  // Fallback fetch implementation using XMLHttpRequest when fetch fails
  private static async fallbackFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    console.log(`HttpClient: XMLHttpRequest attempt to ${url}`);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const method = options.method || "GET";

      try {
        // Add CORS support
        xhr.withCredentials = false;
        xhr.open(method, url);

        // Set headers (exclude signal-related headers)
        if (options.headers) {
          const headers = options.headers as Record<string, string>;
          Object.keys(headers).forEach((key) => {
            // Skip any headers that might cause issues
            if (key.toLowerCase() !== "signal") {
              try {
                xhr.setRequestHeader(key, headers[key]);
              } catch (headerError) {
                console.warn(
                  `HttpClient: Failed to set header ${key}:`,
                  headerError,
                );
              }
            }
          });
        }

        // Handle timeout
        xhr.timeout = 25000; // 25 seconds (longer than fetch timeout)

        xhr.onreadystatechange = () => {
          console.log(
            `HttpClient: XHR readyState: ${xhr.readyState}, status: ${xhr.status}`,
          );
        };

        xhr.onload = () => {
          console.log(
            `HttpClient: XHR onload - Status: ${xhr.status}, Response: ${xhr.responseText?.substring(0, 100)}...`,
          );

          try {
            // Check if the request was successful
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = new Response(xhr.responseText, {
                status: xhr.status,
                statusText: xhr.statusText,
                headers: new Headers({
                  "Content-Type":
                    xhr.getResponseHeader("Content-Type") || "application/json",
                }),
              });
              resolve(response);
            } else {
              reject(
                new Error(
                  `HTTP error ${xhr.status}: ${xhr.statusText || "No status text"}`,
                ),
              );
            }
          } catch (error) {
            console.error("HttpClient: Error creating response:", error);
            reject(new Error(`Failed to create response: ${error}`));
          }
        };

        xhr.onerror = (event) => {
          console.error("HttpClient: XHR error event:", event);
          console.error("HttpClient: XHR error details:", {
            status: xhr.status,
            statusText: xhr.statusText,
            readyState: xhr.readyState,
            responseText: xhr.responseText,
            responseURL: xhr.responseURL,
            url: url,
            method: method,
          });

          // Provide more specific error messages
          let errorMessage = "XMLHttpRequest failed";

          if (xhr.readyState === 0) {
            errorMessage = `Request not initialized - possible CORS or network issue for ${url}`;
          } else if (xhr.readyState === 1) {
            errorMessage = "Request opened but not sent";
          } else if (xhr.readyState === 2) {
            errorMessage = "Headers received but request incomplete";
          } else if (xhr.readyState === 3) {
            errorMessage = "Request in progress";
          } else if (xhr.readyState === 4) {
            if (xhr.status === 0) {
              errorMessage = `Network error or CORS policy blocked request to ${url}. Check if server is running and CORS is configured.`;
            } else {
              errorMessage = `HTTP error ${xhr.status}: ${xhr.statusText || "Unknown error"} for ${url}`;
            }
          }

          reject(new Error(errorMessage));
        };

        xhr.ontimeout = () => {
          console.error("HttpClient: XHR timeout");
          reject(new Error("XMLHttpRequest timeout after 25 seconds"));
        };

        xhr.onabort = () => {
          console.error("HttpClient: XHR aborted");
          reject(new Error("XMLHttpRequest was aborted"));
        };

        // Send request
        console.log(`HttpClient: Sending XHR ${method} request to ${url}`);
        if (options.body) {
          console.log(`HttpClient: Request body:`, options.body);
          xhr.send(options.body as string);
        } else {
          xhr.send();
        }
      } catch (error) {
        console.error("HttpClient: Error setting up XMLHttpRequest:", error);
        reject(new Error(`Failed to setup XMLHttpRequest: ${error}`));
      }
    });
  }

  // Enhanced fetch with fallback mechanism
  static async request(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    this.ensureInitialized();

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    // Create request key for deduplication (only for GET requests)
    const method = options.method || "GET";
    const requestKey = method === "GET" ? `${method}:${url}` : null;

    // Check for pending identical request
    if (requestKey && this.pendingRequests.has(requestKey)) {
      console.log(`HttpClient: Reusing pending request for ${url}`);
      return this.pendingRequests.get(requestKey)!;
    }

    console.log(
      `HttpClient: Request to ${url} (baseUrl: ${this.baseUrl}, endpoint: ${endpoint})`,
    );

    // Validate URL
    if (!url || url === "undefined" || url.includes("undefined")) {
      console.error("HttpClient: Invalid URL constructed:", {
        url,
        baseUrl: this.baseUrl,
        endpoint,
      });
      throw new Error(`Invalid URL: ${url}`);
    }

    // Set default headers
    const defaultHeaders = {
      "Content-Type": "application/json",
    };

    const baseOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    // Create the request promise
    const requestPromise = this.executeRequest(url, baseOptions);

    // Store pending request for deduplication
    if (requestKey) {
      this.pendingRequests.set(requestKey, requestPromise);

      // Clean up after request completes (success or failure)
      requestPromise.finally(() => {
        this.pendingRequests.delete(requestKey);
      });
    }

    return requestPromise;
  }

  // Separate method to execute the actual request
  private static async executeRequest(
    url: string,
    baseOptions: RequestInit,
  ): Promise<Response> {
    // If FullStory or other interference detected, use XMLHttpRequest directly
    if (this.useXHROnly) {
      console.log(
        `HttpClient: Using XMLHttpRequest for ${url} (FullStory detected)`,
      );
      return this.fallbackFetch(url, baseOptions);
    }

    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // First try native fetch with timeout
      controller = new AbortController();

      // Set up timeout
      timeoutId = setTimeout(() => {
        if (controller && !controller.signal.aborted) {
          controller.abort("Request timeout after 20 seconds");
        }
      }, 20000); // 20 second timeout

      const fetchOptions: RequestInit = {
        ...baseOptions,
        signal: controller.signal,
      };

      console.log(`HttpClient: Attempting fetch to ${url}`);
      const response = await fetch(url, fetchOptions);

      // Clear timeout on success
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      console.log(`HttpClient: Fetch successful to ${url}`, response.status);
      return response;
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      console.warn(
        `HttpClient: Fetch failed, trying fallback for ${url}:`,
        error,
      );

      // If this is a FullStory interference error, switch to XHR mode permanently
      if (
        error instanceof TypeError &&
        (error.message.includes("fetch") ||
          error.message.includes("Failed to fetch") ||
          error.stack?.includes("fullstory") ||
          error.stack?.includes("fs.js"))
      ) {
        console.log(
          "HttpClient: Detected FullStory interference, switching to XMLHttpRequest mode permanently",
        );
        this.useXHROnly = true;
      }

      // Check if error is due to abort and not a network issue
      if (error instanceof Error && error.name === "AbortError") {
        console.log(
          `HttpClient: Request was aborted, trying fallback without signal`,
        );
      }

      // Fallback to XMLHttpRequest if fetch fails
      try {
        const response = await this.fallbackFetch(url, baseOptions);
        console.log(
          `HttpClient: Fallback successful to ${url}`,
          response.status,
        );
        return response;
      } catch (fallbackError) {
        console.error(
          `HttpClient: Both fetch and fallback failed for ${url}:`,
          fallbackError,
        );
        throw fallbackError;
      }
    }
  }

  // Retry mechanism for critical requests
  private static async requestWithRetry(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 2,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i <= retries; i++) {
      try {
        const response = await this.request(endpoint, options);
        return response;
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `HttpClient: Attempt ${i + 1} failed for ${endpoint}:`,
          error,
        );

        // If this looks like FullStory interference, switch to XHR mode immediately
        if (
          error instanceof TypeError &&
          (error.message.includes("fetch") ||
            error.message.includes("Failed to fetch") ||
            error.stack?.includes("fullstory") ||
            error.stack?.includes("fs.js"))
        ) {
          console.log(
            "HttpClient: FullStory error detected in retry, switching to XMLHttpRequest mode",
          );
          this.useXHROnly = true;

          // Try one more time with XHR directly
          try {
            const url = endpoint.startsWith("http")
              ? endpoint
              : `${this.baseUrl}${endpoint}`;
            const defaultHeaders = { "Content-Type": "application/json" };
            const baseOptions = {
              ...options,
              headers: { ...defaultHeaders, ...options.headers },
            };
            return await this.fallbackFetch(url, baseOptions);
          } catch (xhrError) {
            console.error("HttpClient: XHR fallback also failed:", xhrError);
          }
        }

        // Don't retry on the last attempt
        if (i < retries) {
          // Wait before retry (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, i) * 1000),
          );
        }
      }
    }

    throw lastError;
  }

  // Convenience methods
  static async get(
    endpoint: string,
    useRetry: boolean = false,
  ): Promise<Response> {
    return useRetry
      ? this.requestWithRetry(endpoint, { method: "GET" })
      : this.request(endpoint, { method: "GET" });
  }

  static async post(
    endpoint: string,
    data?: any,
    useRetry: boolean = true,
  ): Promise<Response> {
    const options = {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    };
    return useRetry
      ? this.requestWithRetry(endpoint, options)
      : this.request(endpoint, options);
  }

  static async put(
    endpoint: string,
    data?: any,
    useRetry: boolean = true,
  ): Promise<Response> {
    const options = {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    };
    return useRetry
      ? this.requestWithRetry(endpoint, options)
      : this.request(endpoint, options);
  }

  static async delete(
    endpoint: string,
    useRetry: boolean = false,
  ): Promise<Response> {
    return useRetry
      ? this.requestWithRetry(endpoint, { method: "DELETE" })
      : this.request(endpoint, { method: "DELETE" });
  }
}

// Initialize the client
HttpClient.init();
