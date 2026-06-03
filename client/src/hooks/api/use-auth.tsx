import { getCurrentUserQueryFn } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const useAuth = () => {
  const query = useQuery({
    queryKey: ["authUser"],
    queryFn: getCurrentUserQueryFn,
    staleTime: 1000 * 60,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  return query;
};

export default useAuth;
