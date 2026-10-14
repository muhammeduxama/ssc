"use client";
import dynamic from "next/dynamic";

const MechanicsMap = dynamic(() => import("./MechanicsMap"), { ssr: false, loading: () => <div className="h-[420px] animate-pulse rounded-lg bg-sunken" /> });
export default MechanicsMap;
