import { useEffect, useState } from 'react'
import { View, Image, StyleSheet, Animated } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'

// Prevent the native splash from auto-hiding
SplashScreen.preventAutoHideAsync()

interface AnimatedSplashProps {
  isReady: boolean
  children: React.ReactNode
}

export function AnimatedSplash({ isReady, children }: AnimatedSplashProps) {
  const [showSplash, setShowSplash] = useState(true)
  const fadeAnim = useState(new Animated.Value(1))[0]

  useEffect(() => {
    if (isReady) {
      // Hide the native static splash
      SplashScreen.hideAsync()

      // Wait for GIF to play (~3 seconds), then fade out
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          setShowSplash(false)
        })
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [isReady])

  if (!showSplash) return <>{children}</>

  return (
    <View style={styles.container}>
      {/* Render the app behind */}
      <View style={StyleSheet.absoluteFill}>{children}</View>

      {/* Animated splash overlay */}
      <Animated.View style={[styles.splash, { opacity: fadeAnim }]}>
        <Image
          source={require('../../assets/splash-animated.gif')}
          style={styles.gif}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  gif: {
    width: 250,
    height: 250,
  },
})
