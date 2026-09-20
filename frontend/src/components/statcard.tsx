const StatCard = ({ title, value, icon, bgClass, textClass }: { title: string, value: string, icon: React.ReactNode, bgClass: string, textClass: string }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center shadow-sm">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 shrink-0 ${bgClass} ${textClass}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-[22px] font-bold text-gray-800 leading-none mb-1">{value}</h3>
        <p className="text-[12px] text-gray-500 font-medium">{title}</p>
      </div>
    </div>
  );
};

export default StatCard;