import { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, Text, View } from "react-native";
import { Image } from "expo-image";
import { Button, uiStyles } from "./ui";
import { surveyImageUrl } from "@/utils/surveyImages";
import { tangentCoordinate } from "@/utils/compositions";
import { colors } from "@/theme";

export function FramingCanvas({
  ra,
  dec,
  horizontalFov,
  verticalFov,
  rotation,
  width,
  overlay,
  opacity,
  onChange,
}: {
  ra: number;
  dec: number;
  horizontalFov: number;
  verticalFov: number;
  rotation: number;
  width: number;
  overlay?: string;
  opacity: number;
  onChange(value: { ra: number; dec: number; rotation: number }): void;
}) {
  const height = Math.min(480, width);
  const cameraWidth = width * 0.7;
  const cameraHeight = (cameraWidth * verticalFov) / horizontalFov;
  const [origin] = useState({ ra, dec });
  const [label, setLabel] = useState({ ra, dec, rotation });
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const [translation] = useState(() => new Animated.ValueXY());
  const [scale] = useState(() => new Animated.Value(1));
  const [angle] = useState(() => new Animated.Value(rotation));
  const state = useRef({ x: 0, y: 0, zoom: 1, rotation });
  const start = useRef({
    x: 0,
    y: 0,
    zoom: 1,
    rotation,
    distance: 0,
    angle: 0,
    dx: 0,
    dy: 0,
    count: 0,
  });
  const current = useRef({ onChange, width, horizontalFov, origin });
  useEffect(() => {
    current.current = { onChange, width, horizontalFov, origin };
  }, [onChange, width, horizontalFov, origin]);
  const [responder, setResponder] =
    useState<ReturnType<typeof PanResponder.create>>();
  useEffect(() => {
    const point = () => {
      const c = current.current;
      return {
        ...tangentCoordinate(
          c.origin.ra,
          c.origin.dec,
          (-state.current.x / (c.width * 0.7)) * c.horizontalFov,
          (state.current.y / (c.width * 0.7)) * c.horizontalFov,
        ),
        rotation: ((state.current.rotation % 360) + 360) % 360,
      };
    };
    const finish = () => {
      const next = point();
      setLabel(next);
      setZoom(state.current.zoom);
      current.current.onChange(next);
    };
    setResponder(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          start.current = {
            ...state.current,
            distance: 0,
            angle: 0,
            dx: 0,
            dy: 0,
            count: 0,
          };
        },
        onPanResponderMove: (event, gesture) => {
          const touches = event.nativeEvent.touches;
          const count = touches.length;
          const distance =
            count >= 2
              ? Math.hypot(
                  touches[1].pageX - touches[0].pageX,
                  touches[1].pageY - touches[0].pageY,
                )
              : 0;
          const bearing =
            count >= 2
              ? (Math.atan2(
                  touches[1].pageY - touches[0].pageY,
                  touches[1].pageX - touches[0].pageX,
                ) *
                  180) /
                Math.PI
              : 0;
          if (start.current.count !== count) {
            start.current = {
              ...state.current,
              distance,
              angle: bearing,
              dx: gesture.dx,
              dy: gesture.dy,
              count,
            };
          }
          const s = start.current;
          const z =
            count >= 2 && s.distance > 0
              ? Math.max(0.7, Math.min(3, (s.zoom * distance) / s.distance))
              : state.current.zoom;
          const r =
            count >= 2
              ? s.rotation + (((bearing - s.angle + 540) % 360) - 180)
              : state.current.rotation;
          const limit = current.current.width * 0.8;
          state.current = {
            x: Math.max(-limit, Math.min(limit, s.x + (gesture.dx - s.dx) / z)),
            y: Math.max(-limit, Math.min(limit, s.y + (gesture.dy - s.dy) / z)),
            zoom: z,
            rotation: r,
          };
          translation.setValue({ x: state.current.x, y: state.current.y });
          scale.setValue(z);
          angle.setValue(r);
          setLabel(point());
        },
        onPanResponderRelease: finish,
        onPanResponderTerminate: finish,
      }),
    );
  }, [angle, scale, translation]);
  const url = surveyImageUrl({
    raHours: origin.ra,
    decDegrees: origin.dec,
    fovDegrees: (horizontalFov / 0.7) * 3,
    width: 1600,
    height: 1600,
  });
  return (
    <View style={{ gap: 10, alignItems: "center" }}>
      <View
        style={{
          width,
          height,
          overflow: "hidden",
          backgroundColor: colors.input,
        }}
        {...responder?.panHandlers}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            width,
            height: width,
            top: (height - width) / 2,
            transform: [{ scale }],
          }}
        >
          <Animated.View
            style={{
              position: "absolute",
              width: width * 3,
              height: width * 3,
              left: -width,
              top: -width,
              transform: translation.getTranslateTransform(),
            }}
          >
            {!failed ? (
              <Image
                source={url}
                style={{ width: "100%", height: "100%" }}
                contentFit="fill"
                cachePolicy="memory-disk"
                onError={() => setFailed(true)}
              />
            ) : null}
          </Animated.View>
          <Animated.View
            style={{
              position: "absolute",
              left: (width - cameraWidth) / 2,
              top: (width - cameraHeight) / 2,
              width: cameraWidth,
              height: cameraHeight,
              borderWidth: 2,
              borderColor: colors.gold,
              transform: [
                {
                  rotate: angle.interpolate({
                    inputRange: [-360, 360],
                    outputRange: ["-360deg", "360deg"],
                  }),
                },
              ],
            }}
          >
            {overlay ? (
              <Image
                source={overlay}
                style={{ width: "100%", height: "100%", opacity }}
                contentFit="fill"
              />
            ) : null}
          </Animated.View>
        </Animated.View>
        {failed ? (
          <View pointerEvents="none" style={{ padding: 20 }}>
            <Text style={uiStyles.body}>
              Survey unavailable. Check your connection and retry.
            </Text>
          </View>
        ) : null}
        <Text
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            color: colors.gold,
          }}
        >
          N ↑ E ←
        </Text>
      </View>
      {failed ? (
        <Button
          title="Retry image"
          variant="secondary"
          onPress={() => setFailed(false)}
        />
      ) : null}
      <Text style={uiStyles.muted}>
        RA {label.ra.toFixed(5)}h · Dec {label.dec.toFixed(5)}° · rotation{" "}
        {label.rotation.toFixed(1)}°
      </Text>
      <Text style={uiStyles.muted}>
        Drag to pan. Pinch to magnify; twist two fingers to rotate the gold
        camera frame. Preview zoom does not change your rig’s field of view.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {[0.7, 1, 1.5, 2, 3].map((z) => (
          <Button
            key={z}
            title={`${zoom === z ? "✓ " : ""}${z}×`}
            variant="secondary"
            onPress={() => {
              state.current.zoom = z;
              scale.setValue(z);
              setZoom(z);
            }}
          />
        ))}
      </View>
    </View>
  );
}
