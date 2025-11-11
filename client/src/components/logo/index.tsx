import { AudioWaveform } from "lucide-react";
import { Link } from "react-router-dom";

const Logo = (props: { url?: string; disableLink?: boolean }) => {
  const { url = "/", disableLink = false } = props;
  const Icon = (
    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
      <AudioWaveform className="size-4" />
    </div>
  );

  if (disableLink) {
    return <div className="flex items-center justify-center sm:justify-start">{Icon}</div>;
  }

  return (
    <div className="flex items-center justify-center sm:justify-start">
      <Link to={url}>{Icon}</Link>
    </div>
  );
};

export default Logo;
