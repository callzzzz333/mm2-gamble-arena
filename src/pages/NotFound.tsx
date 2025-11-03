import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 px-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <p className="text-2xl font-semibold text-foreground">Page Not Found</p>
          <p className="text-muted-foreground max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button 
          onClick={() => navigate("/")} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Home className="mr-2 h-4 w-4" />
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
