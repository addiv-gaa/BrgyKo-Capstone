const StatCard = ({ title, value, icon, bgClass, textClass }: { title: string, value: string, icon: React.ReactNode, bgClass: string, textClass: string }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center shadow-sm">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 shrink-0 ${bgClass} ${textClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-[13px] text-gray-500 font-medium mb-0.5">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 leading-none">{value}</h3>
      </div>
    </div>
  );
};

export default StatCard;