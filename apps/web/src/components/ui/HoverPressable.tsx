import { useState } from 'react'
import { Pressable, type PressableProps, type StyleProp, StyleSheet, type ViewStyle } from 'react-native'

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>
  hoverStyle?: StyleProp<ViewStyle>
}

/**
 * Pressable with a plain style array (no style function), so it can be used
 * under `<Link asChild>`, which merges styles and drops function styles.
 */
export function HoverPressable({ style, hoverStyle, onHoverIn, onHoverOut, ...props }: Props) {
  const [hovered, setHovered] = useState(false)
  return (
    <Pressable
      {...props}
      onHoverIn={(event) => {
        setHovered(true)
        onHoverIn?.(event)
      }}
      onHoverOut={(event) => {
        setHovered(false)
        onHoverOut?.(event)
      }}
      style={StyleSheet.flatten([style, hovered && hoverStyle])}
    />
  )
}
