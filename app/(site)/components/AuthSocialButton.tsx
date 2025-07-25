import { IconType } from "react-icons";

interface AuthSocialButtonProps {
  icon: IconType;
  onClick: () => void;
}

const AuthSocialButton: React.FC<AuthSocialButtonProps> = ({
  icon: Icon,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        inline-flex
        w-full 
        justify-center 
        rounded-md 
        px-4 
        py-2 
        text-gray-500 
        shadow-sm 
        ring-1 
        ring-inset 
        ring-gray-300 
        hover:shadow-md 
        duration-100 
        focus:outline-none 
        focus-visible:ring-2 
        focus-visible:ring-offset-2 
        focus-visible:ring-gray-500
      "
      title="Social Login Button"
    >
      <Icon />
    </button>
  );
};

export default AuthSocialButton;
