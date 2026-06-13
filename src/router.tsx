import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { installNativeFetchRewrite } from "./lib/native-fetch";

export const getRouter = () => {
  // No-op on web/SSR; on native Capacitor builds, reroutes backend calls to
  // the deployed server before any route loader runs.
  installNativeFetchRewrite();

  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
