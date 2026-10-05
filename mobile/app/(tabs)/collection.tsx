import { Text, View } from 'react-native';

export default function CollectionScreen() {
    return (
        <View className="flex-1 bg-azul-noche items-center justify-center px-8">
            <Text className="font-display text-crema text-3xl mb-2">Colección</Text>
            <Text className="font-sans text-gris-pizarra text-sm text-center">
                Próximamente: registra tus expansiones.
            </Text>
        </View>
    );
}