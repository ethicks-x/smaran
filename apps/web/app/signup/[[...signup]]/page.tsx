import { SignUp } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
            <SignUp
                appearance={{
                    variables: {
                        colorPrimary: "#6C4FCB",
                        colorBackground: "#FFFFFF",
                        borderRadius: "1rem",
                    },
                }}
            />
        </div>
    );
}