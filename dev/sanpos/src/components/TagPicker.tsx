import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { TAG_CATEGORIES } from '../constants/tags';
import { Colors } from '../constants/colors';

type TagPickerProps = {
  selected: string[];
  onToggle: (emoji: string) => void;
};

export default function TagPicker({ selected, onToggle }: TagPickerProps) {
  return (
    <ScrollView style={styles.container}>
      {TAG_CATEGORIES.map((category) => (
        <View key={category.label} style={styles.category}>
          <Text style={styles.categoryLabel}>{category.label}</Text>
          <View style={styles.tagGrid}>
            {category.tags.map((tag) => {
              const isSelected = selected.includes(tag.emoji);
              return (
                <TouchableOpacity
                  key={tag.emoji}
                  style={[
                    styles.tagItem,
                    isSelected && styles.tagItemSelected,
                  ]}
                  onPress={() => onToggle(tag.emoji)}
                >
                  <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                  <Text
                    style={[
                      styles.tagLabel,
                      isSelected && styles.tagLabelSelected,
                    ]}
                  >
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  category: {
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSub,
    marginBottom: 6,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Colors.buttonLight,
  },
  tagItemSelected: {
    backgroundColor: Colors.buttonDark,
  },
  tagEmoji: {
    fontSize: 14,
  },
  tagLabel: {
    fontSize: 11,
    color: Colors.tabInactive,
    fontWeight: '600',
  },
  tagLabelSelected: {
    color: Colors.base,
  },
});
