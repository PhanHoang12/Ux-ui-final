import { Redirect } from "expo-router";
import {
  Button,
  Heading,
  LoadingState,
  Notice,
  Screen,
} from "../components/ui";
import { useSession } from "../lib/session";
export default function Start() {
  const session = useSession();
  if (session.loading)
    return (
      <Screen>
        <LoadingState label="Đang khôi phục phiên đăng nhập…" />
      </Screen>
    );
  if (session.problem)
    return (
      <Screen>
        <Heading title="Kết nối lại nhé" />
        <Notice message={session.problem} />
        <Button title="Thử lại" onPress={() => void session.restore()} />
        <Button
          variant="ghost"
          title="Đăng nhập lại"
          onPress={() => void session.abandon()}
        />
      </Screen>
    );
  return <Redirect href={session.user ? "/home" : "/auth/login"} />;
}
