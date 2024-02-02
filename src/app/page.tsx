"use client";
import {
  getTemplateControllerGetTextTemplatesQueryKey,
  useTemplateControllerGetTextTemplates,
} from "../lib/client/api";
import { useSession } from "next-auth/react";

// const getData = async () => {
//   const res = await templateControllerGetTextTemplates();
//   console.log("Res", res);

//   return res;
// };

export default function Home() {
  const { data } = useSession();

  const res = useTemplateControllerGetTextTemplates({},{
    query: {
      queryKey: getTemplateControllerGetTextTemplatesQueryKey(),
      enabled: !!data?.user.backendTokens.at && !!data.user.companyId,
      retry: 2,
    },
    request: {
      headers: { Authorization: `Bearer ${data?.user.backendTokens.at}` },
    },
  });

  return (
    <main className="min-hz-screen flex flex-col items-center justify-between p-24">
      <p>Test</p>
      <div>{JSON.stringify(res.data)} </div>
    </main>
  );
}
