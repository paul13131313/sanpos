import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';
import { TAG_CATEGORIES } from '../constants/tags';

type CheckpointModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { comment: string; tags: string[]; photoUri?: string }) => void;
};

export default function CheckpointModal({ visible, onClose, onSave }: CheckpointModalProps) {
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('カメラはネイティブアプリでのみ使えます');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('カメラの許可が必要です');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const toggleTag = (emoji: string) => {
    setSelectedTags((prev) =>
      prev.includes(emoji) ? prev.filter((t) => t !== emoji) : [...prev, emoji]
    );
  };

  const handleSave = () => {
    onSave({ comment, tags: selectedTags, photoUri });
    setComment('');
    setSelectedTags([]);
    setPhotoUri(undefined);
  };

  const handleClose = () => {
    setComment('');
    setSelectedTags([]);
    setPhotoUri(undefined);
    onClose();
  };

  // 発見スポットタグだけ表示（チェックポイント用）
  const spotTags = TAG_CATEGORIES.find((c) => c.label === '発見スポット')?.tags || [];
  const routeTags = TAG_CATEGORIES.find((c) => c.label === 'ルート特性')?.tags || [];
  const quickTags = [...spotTags, ...routeTags];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <TouchableOpacity activeOpacity={1} onPress={Keyboard.dismiss}>
            <View style={styles.handle} />
            <Text style={styles.title}>📍 チェックポイント</Text>
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
          >
              {/* 写真 */}
              <View style={styles.photoRow}>
                {photoUri ? (
                  <TouchableOpacity onPress={() => setPhotoUri(undefined)}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    <View style={styles.removePhoto}>
                      <Text style={styles.removePhotoText}>✕</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                      <Text style={styles.photoBtnIcon}>📷</Text>
                      <Text style={styles.photoBtnLabel}>撮影</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                      <Text style={styles.photoBtnIcon}>🖼️</Text>
                      <Text style={styles.photoBtnLabel}>選択</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* コメント */}
              <TextInput
                style={styles.input}
                placeholder="ここで何を発見した？"
                placeholderTextColor={Colors.textSub}
                value={comment}
                onChangeText={setComment}
                multiline
                blurOnSubmit={false}
                returnKeyType="default"
                maxLength={200}
              />

              {/* クイックタグ */}
              <Text style={styles.tagSectionLabel}>タグ</Text>
              <View style={styles.tagGrid}>
                {quickTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.emoji);
                  return (
                    <TouchableOpacity
                      key={tag.emoji}
                      style={[styles.tagItem, isSelected && styles.tagItemActive]}
                      onPress={() => toggleTag(tag.emoji)}
                    >
                      <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                      <Text style={[styles.tagLabel, isSelected && styles.tagLabelActive]}>
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

          {/* ボタン（ScrollView外に固定表示） */}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.base,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoBtn: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoBtnIcon: {
    fontSize: 24,
  },
  photoBtnLabel: {
    fontSize: 11,
    color: Colors.textSub,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.buttonDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  tagSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSub,
    marginBottom: 8,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.buttonLight,
  },
  tagItemActive: {
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
  tagLabelActive: {
    color: Colors.base,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.buttonLight,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.tabInactive,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
