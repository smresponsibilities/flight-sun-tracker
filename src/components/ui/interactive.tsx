"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

// Grainy Texture Component
type GrainyTextureProps = {
  className?: string;
  opacity?: number;
  blend?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion";
  color?: string;
};

export function GrainyTexture({
  className = "",
  opacity = 0.2,
  blend = "soft-light",
  color,
}: GrainyTextureProps) {
  return (
    <div
      className={cn("absolute inset-0 z-10 pointer-events-none", className)}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        opacity: opacity,
        mixBlendMode: blend,
        backgroundColor: color || undefined,
      }}
    />
  );
}

// Interactive Card Component
interface InteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  backgroundGradient?: string;
  grainOpacity?: number;
  glowColor?: string;
  shadow?: boolean;
  rotationIntensity?: number;
  hoverScale?: number;
  border?: boolean;
  glowOnHover?: boolean;
  disableGrain?: boolean;
}

export function InteractiveCard({
  children,
  className,
  backgroundGradient,
  grainOpacity = 0.2,
  glowColor = "rgba(59, 130, 246, 0.3)",
  shadow = true,
  rotationIntensity = 10,
  hoverScale = 1.02,
  border = true,
  glowOnHover = true,
  disableGrain = false,
  ...props
}: InteractiveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [transform, setTransform] = useState('');
  const [reflectionStyle, setReflectionStyle] = useState({});

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Mouse position values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring physics for smoother animation
  const springConfig = { damping: 25, stiffness: 300 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  // Limit rotation to a certain degree and update transform CSS
  const updateTransform = React.useCallback((xValue: number, yValue: number) => {
    if (isMobile) return;

    const intensity = rotationIntensity;
    const rotateX = yValue * -intensity;
    const rotateY = xValue * intensity;

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);

    if (glowOnHover && isHovered) {
      setReflectionStyle({
        background: `radial-gradient(circle at ${(xValue + 0.5) * 100}% ${(yValue + 0.5) * 100}%, ${glowColor} 0%, transparent 60%)`,
        opacity: 0.8,
        mixBlendMode: 'plus-lighter',
      });
    }
  }, [isMobile, rotationIntensity, glowOnHover, isHovered, glowColor]);

  // Update transform on spring changes
  useEffect(() => {
    const unsubscribeX = xSpring.on("change", (latestX) => {
      updateTransform(latestX, ySpring.get());
    });

    const unsubscribeY = ySpring.on("change", (latestY) => {
      updateTransform(xSpring.get(), latestY);
    });

    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [xSpring, ySpring, updateTransform]);

  // Track mouse movement
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current || isMobile) return;

    const rect = cardRef.current.getBoundingClientRect();

    // Calculate mouse position relative to card (normalize from -0.5 to 0.5)
    const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
    const mouseY = (e.clientY - rect.top) / rect.height - 0.5;

    x.set(mouseX);
    y.set(mouseY);
  }

  // Reset card position when mouse leaves
  function handleMouseLeave() {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden transition-transform duration-300 ease-out rounded-2xl", // Increased border radius
        border && "border border-white/10 dark:border-white/5",
        shadow && "shadow-xl",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 1000,
        transform: isHovered ? `scale(${hoverScale})` : 'scale(1)',
      }}
      {...props}
    >
      <div
        className="relative w-full h-full rounded-2xl" // Matching border radius
        style={{
          transform: transform,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Background */}
        {backgroundGradient && (
          <div
            className={`absolute inset-0 rounded-2xl ${backgroundGradient}`} // Matching border radius
          />
        )}

        {/* Grain texture */}
        {!disableGrain && <GrainyTexture opacity={grainOpacity} blend="soft-light" />}

        {/* Light reflection effect */}
        {isHovered && glowOnHover && (
          <div
            className="absolute inset-0 w-full h-full rounded-2xl" // Matching border radius
            style={reflectionStyle as React.CSSProperties}
          />
        )}

        {/* Content */}
        <div className="relative z-10 h-full p-8"> {/* Increased padding from default */}
          {children}
        </div>
      </div>
    </div>
  );
}

// Gradient Text Component
interface GradientTextProps {
  text: string;
  className?: string;
  gradient?: string;
  animate?: boolean;
  duration?: number;
  delay?: number;
  as?: React.ElementType;
  interactive?: boolean;
  intensity?: number;
}

export function GradientText({
  text,
  className,
  gradient = "from-blue-600 via-purple-600 to-indigo-600",
  animate = false,
  duration = 8,
  delay = 0,
  as: Component = "span",
  interactive = false,
  intensity = 10,
}: GradientTextProps) {
  const [time, setTime] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // For interactive mode
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 300 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  // Mouse position transforms for 3D effect
  const xTransform = useTransform(
    xSpring,
    [-0.5, 0.5],
    [-intensity, intensity]
  );
  const yTransform = useTransform(
    ySpring,
    [-0.5, 0.5],
    [intensity, -intensity]
  );

  // Handle mouse move for interactive mode
  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    if (!interactive) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const normalizedX = (event.clientX - rect.left) / rect.width - 0.5;
    const normalizedY = (event.clientY - rect.top) / rect.height - 0.5;

    x.set(normalizedX);
    y.set(normalizedY);

    setMousePosition({
      x: normalizedX * 100 + 50,
      y: normalizedY * 100 + 50,
    });
  };

  // Animation timer for moving gradient
  useEffect(() => {
    setIsMounted(true);

    if (!animate) return;

    const interval = setInterval(() => {
      setTime((prev) => (prev + 1) % 360);
    }, duration * 1000 / 360); // Use duration parameter

    return () => clearInterval(interval);
  }, [animate, duration]);

  const baseTextClasses = "font-bold";
  const gradientClasses = animate
    ? `bg-gradient-to-r ${gradient} bg-[length:300%_300%] animate-pulse`
    : `bg-gradient-to-r ${gradient}`;

  if (!isMounted) {
    return (
      <Component
        className={cn(baseTextClasses, "text-transparent bg-clip-text", gradientClasses, className)}
      >
        {text}
      </Component>
    );
  }

  return (
    <motion.div
      className="relative inline-block"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay }}
    >
      {interactive && isHovered && (
        <div
          className="absolute inset-0 -z-10 opacity-70 blur-xl"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(59, 130, 246, 0.5), transparent 70%)`,
          }}
        />
      )}
      <motion.div
        style={{
          rotateX: interactive ? yTransform : 0,
          rotateY: interactive ? xTransform : 0,
          transformStyle: "preserve-3d",
        }}
      >
        <Component
          className={cn(
            baseTextClasses,
            "text-transparent bg-clip-text",
            gradientClasses,
            className
          )}
          style={{
            backgroundPosition: animate ? `${time}% 50%` : undefined,
          }}
        >
          {text}
        </Component>
      </motion.div>
    </motion.div>
  );
}

// Spotlight Effect Container
interface SpotlightContainerProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  spotlightSize?: number;
  intensity?: number;
}

export function SpotlightContainer({
  children,
  className,
  spotlightColor = "rgba(59, 130, 246, 0.15)",
  spotlightSize = 300,
  intensity = 0.8,
}: SpotlightContainerProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePosition({ x, y });
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Spotlight effect */}
      {isHovering && (
        <div
          className="absolute pointer-events-none z-10 mix-blend-soft-light"
          style={{
            width: spotlightSize,
            height: spotlightSize,
            background: `radial-gradient(circle, ${spotlightColor} 0%, transparent 70%)`,
            transform: `translate(${mousePosition.x - spotlightSize / 2}px, ${mousePosition.y - spotlightSize / 2}px)`,
            transition: "transform 0.1s ease-out",
            opacity: intensity, // Use intensity parameter
          }}
        />
      )}

      {children}
    </div>
  );
} 