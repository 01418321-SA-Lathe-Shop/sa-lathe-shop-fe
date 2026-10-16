import BackendWorkspace from "./backend-workspace";

export default function AuthGateway({ register = false }: { register?: boolean }) {
  return <BackendWorkspace initialRegister={register} />;
}
