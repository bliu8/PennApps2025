import { View, Text } from 'react-native'
import React from 'react'

// should basically just be a component that either 
export default function alerts(items: []) {
    if (items) {
        return (<></>)
    }

    return (
        <View>
        <Text>alerts</Text>
        </View>
    )
}