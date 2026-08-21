//supabaseProvider.js

import Provider from "./provider.js";
import supabase from "../config/supabase.js";

export default class SupabaseProvider extends Provider {

    constructor() {

        super();

        console.log("SupabaseProvider inicializado.");

    }
    async getDevice(deviceId) {

        const { data, error } = await supabase
            .from("devices")
            .select("*")
            .eq("device_id", deviceId)
            .limit(1);

        if (error) {

            throw error;

        }

        return data[0] ?? null;

    }



    async getLatestReading(deviceId) {

        const { data, error } = await supabase
            .from("sensor_readings")
            .select("*")
            .eq("deviceId", deviceId)
            .order("created_at", { ascending: false })
            .limit(1);

        if (error) {

            throw error;

        }

        return data[0] ?? null;

    }

}