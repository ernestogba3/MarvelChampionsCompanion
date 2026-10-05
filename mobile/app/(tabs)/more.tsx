import { Text, View } from 'react-native';

export default function MoreScreen() {
    return (
        <View className="flex-1 bg-azul-noche items-center justify-center px-8">
            <Text className="font-display text-crema text-3xl mb-2">Más</Text>
            <Text className="font-sans text-gris-pizarra text-sm text-center">
                Próximamente: ajustes y opciones adicionales.
            </Text>
        </View>
    );
}