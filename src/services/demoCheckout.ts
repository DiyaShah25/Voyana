import { createElement } from "react";
import { createRoot } from "react-dom/client";
import DemoOtpCheckout, {
  type DemoOrder,
} from "@/components/Payment/DemoOtpCheckout";
import type { ConfirmedCheckout } from "./paymentService";
export function showDemoCheckout(order: DemoOrder): Promise<ConfirmedCheckout> {
  return new Promise((resolve, reject) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const cleanup = () =>
      window.setTimeout(() => {
        root.unmount();
        host.remove();
      }, 0);
    root.render(
      createElement(DemoOtpCheckout, {
        order,
        onDone: (result: ConfirmedCheckout) => {
          cleanup();
          resolve(result);
        },
        onCancel: () => {
          cleanup();
          reject(
            new Error(
              "Demo checkout closed. Your booking has not been confirmed.",
            ),
          );
        },
      }),
    );
  });
}
