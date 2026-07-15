import { ColorValue, StyleSheet, View } from 'react-native';

/** Minimal, calm tab glyphs drawn with views — no icon dependency. */

export function DebriefIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.box}>
      <View style={[styles.bubble, { borderColor: color }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
      <View style={[styles.tail, { backgroundColor: color }]} />
    </View>
  );
}

export function LogbookIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.box}>
      <View style={[styles.book, { borderColor: color }]}>
        <View style={[styles.bookLine, { backgroundColor: color }]} />
        <View style={[styles.bookLine, { backgroundColor: color, width: 8 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: 24,
    height: 18,
    borderWidth: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
  },
  dot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
  },
  tail: {
    width: 6,
    height: 2,
    borderRadius: 1,
    marginTop: 1,
    alignSelf: 'center',
    transform: [{ translateX: -4 }],
  },
  book: {
    width: 20,
    height: 22,
    borderWidth: 2,
    borderRadius: 4,
    paddingTop: 4,
    alignItems: 'center',
    gap: 3,
  },
  bookLine: {
    width: 10,
    height: 2,
    borderRadius: 1,
  },
});
