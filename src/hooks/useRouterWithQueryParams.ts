import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";

export const useRouterWithQueryParams = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams()!;

  // Get a new searchParams string by merging the current
  // searchParams with a provided key/value pair
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set(name, value);

      return params.toString();
    },
    [searchParams],
  );

  return {
    push: (name: string, value: string) =>
      router.push(pathname + "?" + createQueryString(name, value)),
  };
};
