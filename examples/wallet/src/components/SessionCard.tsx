import { truncate } from "@/utils/HelperUtil";
import { Avatar, Card, Link, Text } from "@nextui-org/react";
import Image from "next/image";
import NextLink from "next/link";
import { useRouter } from "next/router";

/**
 * Types
 */
interface IProps {
  topic?: string;
  logo?: string;
  name?: string;
  url?: string;
}

/**
 * Component
 */
export default function SessionCard({ logo, name, url, topic }: IProps) {
  const router = useRouter();
  return (
    <NextLink href={topic ? `/session?topic=${topic}` : "#"} passHref>
      <Card
        variant="bordered"
        css={{
          position: "relative",
          marginBottom: "$6",
          minHeight: "70px",
        }}
      >
        <Card.Body
          css={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          <Avatar src={logo} />
          <div style={{ flex: 1 }}>
            <Text h5 css={{ marginLeft: "$9" }}>
              {name}
            </Text>
            <Text
              css={{ marginLeft: "$9", color: "$link" }}
              onClick={() => {
                if (url) router.push(url);
              }}
            >
              {truncate(url?.split("https://")[1] ?? "Unknown", 23)}
            </Text>
          </div>

          <Image src={"/icons/arrow-right-icon.svg"} width={20} height={20} alt="session icon" />
        </Card.Body>
      </Card>
    </NextLink>
  );
}
